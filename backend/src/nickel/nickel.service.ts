import { Injectable, BadRequestException } from '@nestjs/common';
import {
  RecognitionResult,
  RecognitionData,
  OcrMeta,
  CompareResultResponse,
  SpraycodeResultResponse,
} from './types/nickel.types';
import { WORKSHOP_MAP } from './types/nickel.types';
import { ImagePreprocessService } from '../common/services/image-preprocess.service';
import { LabelOcrService } from '../common/services/label-ocr.service';
import { RuleCheckerService } from '../common/services/rule-checker.service';
import { BarcodeParserService } from '../common/services/barcode-parser.service';
import { ConfidenceService } from '../common/services/confidence.service';
import { SpraycodeOcrService } from '../common/services/spraycode-ocr.service';
import { SpraycodeCompareService } from '../common/services/spraycode-compare.service';

@Injectable()
export class NickelService {
  constructor(
    private readonly imagePreprocessService: ImagePreprocessService,
    private readonly labelOcrService: LabelOcrService,
    private readonly ruleCheckerService: RuleCheckerService,
    private readonly barcodeParserService: BarcodeParserService,
    private readonly confidenceService: ConfidenceService,
    private readonly spraycodeOcrService: SpraycodeOcrService,
    private readonly spraycodeCompareService: SpraycodeCompareService,
  ) {}

  /**
   * 识别镍板标签图片（本地OCR + 条码扫描）
   */
  async recognize(
    file: { buffer: Buffer; mimetype: string; size: number },
    barcode?: string,
  ): Promise<RecognitionResult> {
    const ocrMeta: OcrMeta = {
      engine: 'rapid-ocr + zxing-cpp',
      ocrLatency: 0,
      barcodeLatency: 0,
      lineCount: 0,
      barcodeCount: 0,
      barcodeFormat: null,
    };

    try {
      // 基础验证
      if (!file) throw new BadRequestException('请上传图片文件');
      if (!file.buffer || !file.mimetype || file.size === undefined) {
        throw new BadRequestException('无效的文件上传格式');
      }
      if (!this.imagePreprocessService.validateImageFormat(file.mimetype)) {
        throw new BadRequestException(`不支持的文件类型: ${file.mimetype}，请上传 JPG/PNG/GIF/WebP 格式的图片`);
      }
      if (!this.imagePreprocessService.validateImageSize(file.size, 10)) {
        throw new BadRequestException('文件大小不能超过 10MB');
      }

      // 1. 图像预处理
      const originalImage = await this.imagePreprocessService.preprocess(file.buffer);

      // 2. OCR + 条码扫描识别标签
      const { labelData: rawResult, _ocrMeta } = await this.labelOcrService.recognizeLabel(originalImage, barcode);
      Object.assign(ocrMeta, _ocrMeta);

      // OCR 识别结果为空时抛出错误
      const hasAnyField = Object.entries(rawResult).some(
        ([key, val]) => !key.startsWith('_') && val !== null && val !== undefined && val !== '',
      );
      if (!hasAnyField) {
        throw new BadRequestException('识别失败: OCR未识别到任何标签字段');
      }

      // 3. 确定条形码
      const finalBarcode = barcode || rawResult.barcode || undefined;

      // 4. 自动纠正
      const { corrected, corrections, correctedBarcode } = this.ruleCheckerService.autoCorrect(rawResult, finalBarcode);
      const effectiveBarcode = correctedBarcode || finalBarcode;

      // 5. 条码解析后补充 productName/brand
      let barcodeParsed: any = null;
      if (effectiveBarcode) {
        const parsed = this.barcodeParserService.parse(effectiveBarcode);
        if (parsed && parsed.parsed) {
          // 如果纠正后 productName 仍为空，从条码车间代码推导
          if (!corrected.productName && parsed.workshopCode) {
            const workshopName = WORKSHOP_MAP[parsed.workshopCode] || '';
            const parts = workshopName.split('-');
            corrected.productName = parts.length > 1 ? parts[parts.length - 1] : workshopName;
          }

          const productionDateCode = parsed.productionDate
            ? parsed.productionDate.replace(/\D/g, '').slice(2)
            : '';
          barcodeParsed = {
            barcode: parsed.barcode,
            prefix: parsed.prefix,
            productCategoryCode: parsed.productCategoryCode,
            productGradeCode: parsed.productGradeCode,
            productionDateCode: parsed.productionDateCode,
            productionDate: parsed.productionDate,
            workshopCode: parsed.workshopCode,
            workshopName: parsed.workshopName,
            batchNoSuffix: parsed.batchNoSuffix,
            batchNoSuffixLetter: parsed.batchNoSuffixLetter,
            packCode: parsed.packCode,
            expectedPackNo: parsed.expectedPackNo,
            netWeightEncoded: parsed.netWeightEncoded,
            expectedNetWeight: parsed.expectedNetWeight,
            parsed: parsed.parsed,
            message: parsed.message,
          };
        }
      }

      // 6. 硬编码默认值（OCR 未识别时补充）
      if (!corrected.brand) corrected.brand = '金川';
      if (!corrected.standard) corrected.standard = 'GB/T 6516-2025';
      if (!corrected.address) corrected.address = '甘肃省金昌市金川区北京路10号';
      if (!corrected.weightBy) corrected.weightBy = '按净重计价';

      // 7. 规则校验
      const checkResults = this.ruleCheckerService.check(corrected, effectiveBarcode || undefined);

      // 8. 统计
      const errorCount = checkResults.filter(r => r.severity === 'error').length;
      const warningCount = checkResults.filter(r => r.severity === 'warning').length;
      const allPassed = checkResults.every(r => r.passed);

      // 9. 置信度
      const confidence = this.confidenceService.calculate(corrected, corrections, checkResults, barcodeParsed);

      // 10. 返回结果
      return {
        success: true,
        data: {
          rawData: rawResult,
          correctedData: corrected,
          corrections,
          checkResults,
          barcodeParsed,
          allPassed,
          errorCount,
          warningCount,
          confidence,
          _ocrMeta: ocrMeta,
        },
        message: allPassed
          ? '识别成功，所有字段校验通过'
          : `识别完成，发现 ${errorCount} 个错误和 ${warningCount} 个警告`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      return {
        success: false,
        data: {
          rawData: null,
          correctedData: null,
          corrections: [],
          checkResults: [],
          barcodeParsed: null,
          allPassed: false,
          errorCount: 1,
          warningCount: 0,
          confidence: null,
          _ocrMeta: ocrMeta,
        },
        message: `识别失败: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 喷码OCR识别
   */
  async recognizeSpraycode(file: { buffer: Buffer; mimetype: string; size: number }): Promise<SpraycodeResultResponse> {
    if (!file) throw new BadRequestException('请上传图片文件');
    if (!file.buffer || !file.mimetype || file.size === undefined) {
      throw new BadRequestException('无效的文件上传格式');
    }
    if (!this.imagePreprocessService.validateImageFormat(file.mimetype)) {
      throw new BadRequestException(`不支持的文件类型: ${file.mimetype}`);
    }
    if (!this.imagePreprocessService.validateImageSize(file.size, 10)) {
      throw new BadRequestException('文件大小不能超过 10MB');
    }

    const spraycodeResult = await this.spraycodeOcrService.recognizeSpraycode(file.buffer);

    return {
      success: true,
      data: spraycodeResult,
      message: '喷码识别成功',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 喷码对比
   */
  async compare(
    sprayFile: { buffer: Buffer; mimetype: string; size: number },
    labelFile?: { buffer: Buffer; mimetype: string; size: number },
    labelResult?: any,
  ): Promise<CompareResultResponse> {
    // 校验喷码图片
    if (!sprayFile) throw new BadRequestException('请上传喷码图片');
    if (!sprayFile.buffer || !sprayFile.mimetype || sprayFile.size === undefined) {
      throw new BadRequestException('无效的喷码图片上传格式');
    }
    if (!this.imagePreprocessService.validateImageFormat(sprayFile.mimetype)) {
      throw new BadRequestException(`不支持的喷码图片类型: ${sprayFile.mimetype}`);
    }
    if (!this.imagePreprocessService.validateImageSize(sprayFile.size, 10)) {
      throw new BadRequestException('喷码图片大小不能超过 10MB');
    }

    // 校验标签图片（可选）
    if (labelFile) {
      if (!labelFile.buffer || !labelFile.mimetype || labelFile.size === undefined) {
        throw new BadRequestException('无效的标签图片上传格式');
      }
      if (!this.imagePreprocessService.validateImageFormat(labelFile.mimetype)) {
        throw new BadRequestException(`不支持的标签图片类型: ${labelFile.mimetype}`);
      }
      if (!this.imagePreprocessService.validateImageSize(labelFile.size, 10)) {
        throw new BadRequestException('标签图片大小不能超过 10MB');
      }
    }
    const sprayCodeData = await this.spraycodeOcrService.recognizeSpraycode(sprayFile.buffer);

    let labelData: any = null;
    if (labelFile) {
      const labelResultData = await this.recognize(labelFile);
      if (labelResultData.success && labelResultData.data.correctedData) {
        labelData = {
          packNo: { cn: labelResultData.data.correctedData.packNo, en: labelResultData.data.correctedData.packNo },
          batchNo: { cn: labelResultData.data.correctedData.batchNo, en: labelResultData.data.correctedData.batchNo },
          netWeight: { cn: labelResultData.data.correctedData.netWeight, en: labelResultData.data.correctedData.netWeight },
          productionDate: { cn: labelResultData.data.correctedData.productionDate, en: labelResultData.data.correctedData.productionDate },
        };
      }
    } else if (labelResult) {
      labelData = labelResult;
    }

    const compareResults = this.spraycodeCompareService.compare(sprayCodeData as any, labelData as any);
    const summary = this.spraycodeCompareService.summarize(compareResults);

    return {
      success: true,
      data: { compareResults, summary, sprayCodeData, labelCodeData: labelData },
      message: '喷码对比完成',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 健康检查（返回标准响应格式）
   */
  health(): { success: true; data: { status: string; version: string }; message: string; timestamp: string } {
    return {
      success: true,
      data: {
        status: 'ok',
        version: '2.0.0',
      },
      message: '服务运行正常',
      timestamp: new Date().toISOString(),
    };
  }
}
