import { Injectable, BadRequestException } from '@nestjs/common';
import {
  RecognitionResult,
  RecognitionData,
  OcrMeta,
  CompareResultResponse,
  SpraycodeResultResponse,
  SpraycodeResult,
  NickelLabelData,
} from './types/nickel.types';
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
   * 识别镍板标签图片（v2.3.6：条码优先）
   *
   * 流程：
   * 1. 图像预处理
   * 2. labelOcrService 走条码解析路径，已经一次完成所有字段填充
   * 3. 规则校验（基于条码解析出来的 batchNo/packNo/netWeight/productionDate）
   * 4. 置信度评分
   * 5. 返回
   */
  async recognize(
    file: { buffer: Buffer; mimetype: string; size: number },
    barcode?: string,
  ): Promise<RecognitionResult> {
    const startMeta: OcrMeta = {
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

      // 2. OCR + 条码扫描（v2.3.6：条码优先 — labelOcr 内部完成所有字段填充）
      const { labelData: rawResult, barcodeParsed, _ocrMeta } = await this.labelOcrService.recognizeLabel(
        originalImage,
        barcode,
      );
      Object.assign(startMeta, _ocrMeta);

      // 3. 条码驱动字段已全部填好。仅在用户未传 barcode 时使用解析出的码做下游
      const effectiveBarcode = rawResult.barcode ?? undefined;

      // 4. 自动纠正（针对条码反推出的规范化字段通常 no-op）
      const { corrected, corrections } = this.ruleCheckerService.autoCorrect(rawResult, effectiveBarcode);

      // 5. 规则校验（基于条码反推字段）
      const checkResults = this.ruleCheckerService.check(corrected, effectiveBarcode);

      // 6. 统计
      const errorCount = checkResults.filter((r) => r.severity === 'error').length;
      const warningCount = checkResults.filter((r) => r.severity === 'warning').length;
      const allPassed = checkResults.every((r) => r.passed);

      // 7. 置信度（基于条码反推的规范化结果，扣分维度更少）
      const confidence = this.confidenceService.calculate(corrected, corrections, checkResults, barcodeParsed);

      // 8. 消息文案：优先展示 warning 给用户友好提示
      const message = rawResult._warning
        ? rawResult._warning
        : allPassed
          ? '识别成功，所有字段校验通过'
          : `识别完成，发现 ${errorCount} 个错误和 ${warningCount} 个警告`;

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
          _ocrMeta: startMeta,
        },
        message,
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
          _ocrMeta: startMeta,
        },
        message: `识别失败: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 喷码 OCR 识别（v2.3.6：条码优先）
   */
  async recognizeSpraycode(
    file: { buffer: Buffer; mimetype: string; size: number },
  ): Promise<SpraycodeResultResponse> {
    if (!file) throw new BadRequestException('请上传图片文件');
    if (!file.buffer || !file.mimetype || file.size === undefined) {
      throw new BadRequestException('无效的文件上传格式');
    }
    if (!this.imagePreprocessService.validateImageFormat(file.mimetype)) {
      throw new BadRequestException(`不支持的文件类型: ${file.mimetype}`);
    }
    if (!this.imagePreprocessService.validateImageSize(file.size, 10)) {
      throw new BadRequestException('喷码图片大小不能超过 10MB');
    }

    const spraycodeResult = await this.spraycodeOcrService.recognizeSpraycode(file.buffer);

    return {
      success: true,
      data: spraycodeResult,
      message: spraycodeResult._warning ?? '喷码识别成功',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 喷码对比（v2.3.6：仅对比条码能映射的字段）
   *
   * 字段集：batchNo / packNo / productionDate / netWeight
   * 注意：userBarcode/labelFile 仍可传入，用于驱动标签侧条码识别
   */
  async compare(
    sprayFile: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
    labelFile?: { buffer: Buffer; mimetype: string; size: number; originalname?: string },
    _labelBarcode?: string,
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

    // 1. 喷码侧：条码优先
    const sprayCodeData = await this.spraycodeOcrService.recognizeSpraycode(sprayFile.buffer);

    // 2. 标签侧：如有标签图走 LabelOcrService；否则用 labelResult 透传
    let labelData: NickelLabelData | null = null;
    if (labelFile) {
      const labelResult = await this.recognize(labelFile);
      if (labelResult.success && labelResult.data.correctedData) {
        labelData = labelResult.data.correctedData;
      }
    }

    // 3. 字段级对比（仅 4 个字段：batchNo/packNo/productionDate/netWeight）
    const compareResults = this.spraycodeCompareService.compare(
      sprayCodeData as SpraycodeResult,
      labelData,
    );
    const summary = this.spraycodeCompareService.summarize(compareResults);

    return {
      success: true,
      data: { compareResults, summary, sprayCodeData, labelCodeData: labelData as any },
      message: '喷码对比完成',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 健康检查
   */
  health(): { success: true; data: { status: string; version: string }; message: string; timestamp: string } {
    return {
      success: true,
      data: { status: 'ok', version: '2.0.0' },
      message: '服务运行正常',
      timestamp: new Date().toISOString(),
    };
  }
}
