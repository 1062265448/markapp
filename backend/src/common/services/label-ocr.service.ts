import { Injectable, Logger } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { NickelLabelData, OcrMeta, BarcodeParsed } from '../../nickel/types/nickel.types';
import { WORKSHOP_MAP } from '../../nickel/types/nickel.types';
import { BarcodeParserService } from './barcode-parser.service';
import {
  callOcrFull,
  pickBestBarcode,
  normalize25DigitBarcode,
} from './ocr-utils';

// LabelOcrService 返回的完整结果（v2.3.6 起以条码为主）
export interface LabelOcrResult {
  labelData: NickelLabelData;
  barcodeParsed: BarcodeParsed | null;
  _ocrMeta: OcrMeta;
}

@Injectable()
export class LabelOcrService {
  private readonly logger = new Logger(LabelOcrService.name);
  private rapidOcrUrl: string;

  constructor(
    private config: NickelConfigService,
    private barcodeParser: BarcodeParserService,
  ) {
    this.rapidOcrUrl = this.config.rapidOcrUrl;
  }

  /**
   * v2.3.6 重构：识别标签图片
   *
   * 数据源优先级：
   * 1. 用户手动输入的 barcode（userBarcode）— 最高优先
   * 2. zxing-cpp 扫到的 25 位行业编码（pickBestBarcode 选最优）
   * 3. 都没有 → 返回空数据 + _warning（不降级到 OCR 文本）
   *
   * OCR 文本仅作为参考信号展示在 _warning 中，不参与业务字段提取。
   */
  async recognizeLabel(imageBuffer: Buffer, userBarcode?: string): Promise<LabelOcrResult> {
    const start = Date.now();
    this.logger.log('开始标签识别（条码优先）');

    // 调 OCR + 条码扫描
    const { lines, barcodes, ocrLatencyMs, barcodeLatencyMs, barcodeCount } = await callOcrFull(
      imageBuffer,
      this.rapidOcrUrl,
    );

    // 选条码（用户手输优先；否则从扫出的码里挑 25 位）
    const rawBarcode = userBarcode?.trim() || pickBestBarcode(barcodes);
    const cleanedBarcode = rawBarcode ? normalize25DigitBarcode(rawBarcode) : null;

    const meta: OcrMeta = {
      engine: 'rapid-ocr + zxing-cpp',
      ocrLatency: ocrLatencyMs,
      barcodeLatency: barcodeLatencyMs,
      lineCount: lines.length,
      barcodeCount,
      barcodeFormat: barcodes[0]?.format || null,
      barcodes: barcodes.map((b) => ({ text: b.text, format: b.format })),
    };

    // === 失败分支：没有拿到 25 位条码 ===
    if (!cleanedBarcode) {
      const reason = !rawBarcode
        ? `未扫到条码（zxing 识别出 ${barcodeCount} 个码，均非 25 位行业编码）`
        : `条码格式无效：期望 25 位数字，实际 "${rawBarcode.slice(0, 30)}${rawBarcode.length > 30 ? '...' : ''}"`;
      this.logger.warn(reason);
      return {
        labelData: this.emptyLabel(cleanedBarcode ? cleanedBarcode : null, reason),
        barcodeParsed: null,
        _ocrMeta: meta,
      };
    }

    // === 主路径：解析 25 位行业编码 ===
    const parsed = this.barcodeParser.parse(cleanedBarcode);
    if (!parsed || !parsed.parsed) {
      const reason = parsed?.message || '25 位条码解析失败';
      this.logger.warn(`${reason} → ${cleanedBarcode}`);
      return {
        labelData: this.emptyLabel(cleanedBarcode, reason),
        barcodeParsed: parsed,
        _ocrMeta: meta,
      };
    }

    // === 成功：用 BarcodeParsed 反推 labelData ===
    const labelData = this.mapBarcodeToLabel(parsed);
    const totalLatency = Date.now() - start;
    this.logger.log(
      `标签识别完成，耗时: ${totalLatency} ms, 批号: ${labelData.batchNo}, 包号: ${labelData.packNo}, 日期: ${labelData.productionDate}`,
    );

    return {
      labelData,
      barcodeParsed: parsed,
      _ocrMeta: meta,
    };
  }

  /**
   * 用 BarcodeParsed 反推 NickelLabelData
   * 业务常量（brand/standard/address/weightBy）保持硬编码配置
   */
  private mapBarcodeToLabel(p: BarcodeParsed): NickelLabelData {
    const workshopName = WORKSHOP_MAP[p.workshopCode] || '';
    // productName 从车间名取最后一段（如"电解一车间-电解镍" → "电解镍"）
    const productName = workshopName.includes('-')
      ? workshopName.split('-').slice(-1)[0]
      : workshopName;

    const yearShort = p.productionDate ? p.productionDate.slice(2, 4) : '';
    const batchNo = `${yearShort}-${p.workshopCode}-${p.batchNoSuffix}${p.batchNoSuffixLetter}`;

    return {
      productName,
      brand: '金川',                       // 业务常量
      standard: 'GB/T 6516-2025',          // 业务常量
      batchNo,
      packNo: p.expectedPackNo,
      pieces: null,                        // 条码未编码
      netWeight: p.expectedNetWeight,
      grossWeight: null,                   // 条码未编码
      productionDate: p.productionDate ?? null,
      weightBy: '按净重计价',                // 业务常量
      address: '甘肃省金昌市金川区北京路10号', // 业务常量
      barcode: p.barcode,
      _barcodeRaw: p.barcode,
    };
  }

  /**
   * 构造空白 label（条码失败时用）
   */
  private emptyLabel(barcodeRaw: string | null, reason: string): NickelLabelData {
    return {
      productName: null,
      brand: null,
      standard: null,
      batchNo: null,
      packNo: null,
      pieces: null,
      netWeight: null,
      grossWeight: null,
      productionDate: null,
      weightBy: null,
      address: null,
      barcode: barcodeRaw,
      _barcodeRaw: barcodeRaw ?? undefined,
      _warning: reason,
    };
  }
}
