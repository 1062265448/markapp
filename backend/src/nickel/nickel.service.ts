import { Injectable, BadRequestException } from '@nestjs/common';
import {
  RecognitionResult,
  RecognitionData,
  NickelLabelData,
  AIMeta,
  MergeStats,
} from './types/nickel.types';
import { ImagePreprocessService } from '../common/services/image-preprocess.service';
import { QwenAIService } from '../common/services/qwen-ai.service';
import { VolcAIService } from '../common/services/volc-ai.service';
import { GlmAIService } from '../common/services/glm-ai.service';
import { RuleCheckerService } from '../common/services/rule-checker.service';
import { BarcodeParserService } from '../common/services/barcode-parser.service';
import { ConfidenceService } from '../common/services/confidence.service';
import { SpraycodeOcrService } from '../common/services/spraycode-ocr.service';
import { SpraycodeCompareService } from '../common/services/spraycode-compare.service';

// Model outcome interfaces for better type narrowing
interface ModelSuccess {
  success: true;
  result: any;
  latency: number;
}
interface ModelFailure {
  success: false;
  error: string;
  skipped?: boolean;
}
type ModelOutcome = ModelSuccess | ModelFailure;

interface SuccessEntry {
  model: string;
  result: any;
  latency: number;
}

@Injectable()
export class NickelService {
  constructor(
    private readonly imagePreprocessService: ImagePreprocessService,
    private readonly qwenAIService: QwenAIService,
    private readonly volcAIService: VolcAIService,
    private readonly glmAIService: GlmAIService,
    private readonly ruleCheckerService: RuleCheckerService,
    private readonly barcodeParserService: BarcodeParserService,
    private readonly confidenceService: ConfidenceService,
    private readonly spraycodeOcrService: SpraycodeOcrService,
    private readonly spraycodeCompareService: SpraycodeCompareService,
  ) {}

  /**
   * 识别镍板标签图片（三模型并行投票）
   */
  async recognize(
    file: { buffer: Buffer; mimetype: string; size: number },
    barcode?: string,
    enableGLM: boolean = true,
  ): Promise<RecognitionResult> {
    const aiMeta: AIMeta = {
      model: 'doubao-vision-pro',
      retry: false,
      secondaryModel: null,
      tertiaryModel: null,
      secondaryError: null,
      tertiaryError: null,
      tertiarySkipped: false,
      primaryLatency: 0,
      volcLatency: 0,
      glmLatency: 0,
      qwenLatency: 0,
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
      const originalImage = await this.imagePreprocessService.preprocess(Buffer.from(file.buffer));

      // 2. 并行调用三模型
      const volcStart = Date.now();
      const volcPromise: Promise<ModelOutcome> = this.volcAIService.recognizeNickelLabel(originalImage)
        .then(r => ({ success: true as const, result: r, latency: Date.now() - volcStart }))
        .catch(e => ({ success: false as const, error: (e as Error).message }));

      const qwenStart = Date.now();
      const qwenPromise: Promise<ModelOutcome> = this.qwenAIService.recognizeNickelLabel(originalImage)
        .then(r => ({ success: true as const, result: r, latency: Date.now() - qwenStart }))
        .catch(e => ({ success: false as const, error: (e as Error).message }));

      let glmPromise: Promise<ModelOutcome>;
      if (enableGLM) {
        const glmStart = Date.now();
        glmPromise = this.glmAIService.recognizeNickelLabel(originalImage)
          .then(r => ({ success: true as const, result: r, latency: Date.now() - glmStart }))
          .catch(e => ({ success: false as const, error: (e as Error).message }));
      } else {
        glmPromise = Promise.resolve({ success: false as const, error: 'GLM已关闭(用户设置)', skipped: true });
        aiMeta.tertiarySkipped = true;
      }

      const [volcOutcome, qwenOutcome, glmOutcome] = await Promise.all([volcPromise, qwenPromise, glmPromise]);

      // Helper to safely get values from outcomes
      const getSuccessResult = (o: ModelOutcome): any | null => o.success ? (o as ModelSuccess).result : null;
      const getSuccessLatency = (o: ModelOutcome): number => o.success ? (o as ModelSuccess).latency : 0;
      const getError = (o: ModelOutcome): string | null => !o.success ? (o as ModelFailure).error : null;
      const isSkipped = (o: ModelOutcome): boolean => !o.success && (o as ModelFailure).skipped === true;

      // 3. 记录元数据
      aiMeta.volcLatency = getSuccessLatency(volcOutcome);
      aiMeta.qwenLatency = getSuccessLatency(qwenOutcome);
      aiMeta.glmLatency = getSuccessLatency(glmOutcome);

      if (qwenOutcome.success) aiMeta.secondaryModel = { model: 'qwen-vl-ocr', latency: getSuccessLatency(qwenOutcome) };
      else aiMeta.secondaryError = getError(qwenOutcome);

      if (glmOutcome.success) aiMeta.tertiaryModel = { model: 'glm-4.6v-flash', latency: getSuccessLatency(glmOutcome) };
      else if (isSkipped(glmOutcome)) aiMeta.tertiarySkipped = true;
      else aiMeta.tertiaryError = getError(glmOutcome);

      // 4. 投票合并
      const successList: SuccessEntry[] = [];
      const volcResult = getSuccessResult(volcOutcome);
      if (volcResult) successList.push({ model: 'doubao', result: volcResult, latency: getSuccessLatency(volcOutcome) });

      const qwenResult = getSuccessResult(qwenOutcome);
      if (qwenResult) successList.push({ model: 'qwen', result: qwenResult, latency: getSuccessLatency(qwenOutcome) });

      const glmResult = getSuccessResult(glmOutcome);
      if (glmResult) successList.push({ model: 'glm-4.6v-flash', result: glmResult, latency: getSuccessLatency(glmOutcome) });

      const successCount = successList.length;
      if (successCount === 0) {
        throw new BadRequestException('识别失败:三模型均无法识别');
      }

      const primaryModel = enableGLM ? 'glm-4.6v-flash' : 'doubao';
      aiMeta.model = primaryModel;
      if (primaryModel === 'glm-4.6v-flash' && glmOutcome.success) aiMeta.primaryLatency = getSuccessLatency(glmOutcome);
      else if (volcOutcome.success) aiMeta.primaryLatency = getSuccessLatency(volcOutcome);

      const mergeStats: MergeStats = { consistent: 0, volcFilled: 0, conflicts: 0, details: [] };
      let rawResult: any;

      if (successCount === 1) {
        rawResult = { ...successList[0].result };
        aiMeta.model = successList[0].model;
        aiMeta.primaryLatency = successList[0].latency;
      } else if (successCount === 2) {
        const primaryEntry = successList.find(m => m.model === primaryModel) || successList[0];
        const otherEntry = successList.find(m => m.model !== primaryEntry.model)!;
        rawResult = { ...primaryEntry.result };
        rawResult = this.mergeResults(rawResult, otherEntry.result, mergeStats);
        aiMeta.model = primaryEntry.model + ' + ' + otherEntry.model;
      } else {
        if (enableGLM) {
          rawResult = this.threeWayMerge(glmResult!, qwenResult!, volcResult!, mergeStats);
          aiMeta.model = 'glm-4.6v-flash + qwen-vl-ocr + doubao-vision-pro';
        } else {
          rawResult = this.threeWayMerge(volcResult!, qwenResult!, glmResult!, mergeStats);
          aiMeta.model = 'doubao-vision-pro + qwen-vl-ocr + glm-4.6v-flash';
        }
      }

      // 保存原始结果
      let primaryRawData: NickelLabelData | null = null;
      let secondaryRawData: NickelLabelData | null = null;
      let tertiaryRawData: NickelLabelData | null = null;

      if (enableGLM) {
        primaryRawData = glmResult as NickelLabelData | null;
        secondaryRawData = qwenResult as NickelLabelData | null;
        tertiaryRawData = volcResult as NickelLabelData | null;
      } else {
        primaryRawData = volcResult as NickelLabelData | null;
        secondaryRawData = qwenResult as NickelLabelData | null;
        tertiaryRawData = glmResult as NickelLabelData | null;
      }

      // 5. 确定条形码
      const finalBarcode = barcode || rawResult.barcode;

      // 6. 自动纠正
      const { corrected, corrections, correctedBarcode } = this.ruleCheckerService.autoCorrect(rawResult, finalBarcode);
      const effectiveBarcode = correctedBarcode || finalBarcode;

      // 7. 规则校验
      const checkResults = this.ruleCheckerService.check(corrected, effectiveBarcode);

      // 8. 条形码解析
      let barcodeParsed: any = null;
      if (effectiveBarcode) {
        const parsed = this.barcodeParserService.parse(effectiveBarcode);
        if (parsed) {
          const productionDateCode = parsed.productionDate
            ? parsed.productionDate.replace(/\D/g, '').slice(2)
            : '';
          barcodeParsed = {
            barcode: parsed.barcode,
            prefix: parsed.prefix,
            month: parsed.month,
            day: parsed.day,
            productionDateCode,
            productionDate: parsed.productionDate,
            workshopCode: parsed.workshopCode,
            workshopName: parsed.workshopName,
            batchNoSuffix: parsed.batchNoSuffix,
            packCode: parsed.packCode,
            expectedPackNo: parsed.expectedPackNo,
            netWeightEncoded: parsed.netWeightEncoded,
            expectedNetWeight: parsed.expectedNetWeight,
            parsed: parsed.parsed,
            message: parsed.message,
          };
        }
      }

      // 9. 统计
      const errorCount = checkResults.filter(r => r.severity === 'error').length;
      const warningCount = checkResults.filter(r => r.severity === 'warning').length;
      const allPassed = checkResults.every(r => r.passed);

      // 10. 置信度
      const confidence = this.confidenceService.calculate(corrected, corrections, checkResults, barcodeParsed);

      // 11. 返回结果
      const modelCountStr = successCount === 3 ? '（三模型）' : (successCount >= 2 ? '（双模型）' : (aiMeta.tertiarySkipped ? '（单模型·GLM关闭）' : '（单模型）'));

      return {
        success: true,
        data: {
          rawData: rawResult,
          secondaryRawData,
          tertiaryRawData,
          correctedData: corrected,
          corrections,
          checkResults,
          barcodeParsed,
          allPassed,
          errorCount,
          warningCount,
          confidence,
          mergeStats,
          _aiMeta: aiMeta,
        },
        message: allPassed
          ? `识别成功，所有字段校验通过${modelCountStr}`
          : `识别完成，发现 ${errorCount} 个错误和 ${warningCount} 个警告`,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      if (error instanceof BadRequestException) throw error;

      return {
        success: false,
        data: {
          rawData: null,
          secondaryRawData: null,
          tertiaryRawData: null,
          correctedData: null,
          corrections: [],
          checkResults: [],
          barcodeParsed: null,
          allPassed: false,
          errorCount: 1,
          warningCount: 0,
          confidence: null,
          mergeStats: null,
          _aiMeta: aiMeta,
        },
        message: `识别失败: ${(error as Error).message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * 喷码OCR识别
   */
  async recognizeSpraycode(file: { buffer: Buffer; mimetype: string; size: number }): Promise<any> {
    if (!file) throw new BadRequestException('请上传图片文件');
    if (!this.imagePreprocessService.validateImageFormat(file.mimetype)) {
      throw new BadRequestException(`不支持的文件类型: ${file.mimetype}`);
    }

    const imageBuffer = Buffer.from(file.buffer);
    const spraycodeResult = await this.spraycodeOcrService.recognizeSpraycode(imageBuffer);

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
  ): Promise<any> {
    const sprayBuffer = Buffer.from(sprayFile.buffer);
    const sprayCodeData = await this.spraycodeOcrService.recognizeSpraycode(sprayBuffer);

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
      data: { compareResults, summary, sprayCodeData },
      message: '喷码对比完成',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 健康检查
   */
  health(): { status: string; timestamp: string; version: string } {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  // === 内部辅助方法 ===

  private mergeResults(primary: any, secondary: any, stats: MergeStats): any {
    const merged = { ...primary };
    const allKeys = new Set([...Object.keys(primary), ...Object.keys(secondary)]);

    for (const key of allKeys) {
      if (key.startsWith('_')) continue;
      const pv = primary[key];
      const sv = secondary[key];

      if (String(pv).toLowerCase() === String(sv).toLowerCase()) {
        stats.consistent++;
        continue;
      }

      if (pv === null || pv === undefined || pv === '') {
        if (sv !== null && sv !== undefined && sv !== '') {
          merged[key] = sv;
          stats.volcFilled++;
          stats.details.push({ field: key, primary: '(空)', secondary: String(sv), action: 'filled' });
        }
        continue;
      }

      if (sv === null || sv === undefined || sv === '') continue;

      stats.conflicts++;
      stats.details.push({ field: key, primary: String(pv), secondary: String(sv), action: 'keep_primary' });
    }

    return merged;
  }

  private threeWayMerge(model1: any, model2: any, model3: any, stats: MergeStats): any {
    const merged = { ...model1 };
    const allKeys = new Set([...Object.keys(model1), ...Object.keys(model2), ...Object.keys(model3)]);

    for (const key of allKeys) {
      if (key.startsWith('_')) continue;

      const v1 = model1[key];
      const v2 = model2[key];
      const v3 = model3[key];

      if (String(v1).toLowerCase() === String(v2).toLowerCase() &&
          String(v2).toLowerCase() === String(v3).toLowerCase()) {
        stats.consistent++;
        continue;
      }

      const validValues: Array<{ model: string; val: any }> = [];
      if (v1 !== null && v1 !== undefined && v1 !== '') validValues.push({ model: 'm1', val: v1 });
      if (v2 !== null && v2 !== undefined && v2 !== '') validValues.push({ model: 'm2', val: v2 });
      if (v3 !== null && v3 !== undefined && v3 !== '') validValues.push({ model: 'm3', val: v3 });

      if (validValues.length === 0) continue;
      if (validValues.length === 1) {
        merged[key] = validValues[0].val;
        stats.volcFilled++;
        stats.details.push({ field: key, primary: '(vote)', secondary: String(validValues[0].val), action: 'single_model_filled' });
        continue;
      }

      const voteCount: Record<string, number> = {};
      for (const entry of validValues) {
        const keyStr = String(entry.val).toLowerCase().trim();
        voteCount[keyStr] = (voteCount[keyStr] || 0) + 1;
      }

      let maxVotes = 0;
      let winner: string | null = null;
      for (const [valKey, count] of Object.entries(voteCount)) {
        if (count > maxVotes) { maxVotes = count; winner = valKey; }
      }

      let winnerVal = null;
      for (const entry of validValues) {
        if (String(entry.val).toLowerCase().trim() === winner) { winnerVal = entry.val; break; }
      }

      if (maxVotes >= 2) {
        merged[key] = winnerVal;
        stats.consistent++;
        stats.details.push({ field: key, primary: String(v1), secondary: String(v2), tertiary: String(v3), action: 'majority_wins', winner: winner || '' });
      } else {
        stats.conflicts++;
        stats.details.push({ field: key, primary: String(v1), secondary: String(v2), tertiary: String(v3), action: 'all_conflict_keep_primary' });
      }
    }

    return merged;
  }
}
