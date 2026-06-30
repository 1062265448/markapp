import { Injectable } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { OcrMeta } from '../../nickel/types/nickel.types';
import { BarcodeParserService } from './barcode-parser.service';
import {
  callOcrFull,
  pickBestBarcode,
  normalize25DigitBarcode,
} from './ocr-utils';

interface SpraycodeFields {
  batchNo: string | null;
  packNo: string | null;
  productionDate: string | null;
  netWeight: number | null;
  grossWeight: number | null;
  pieces: number | null;
  _ocrMeta?: OcrMeta;
  _warning?: string;
  _barcodeRaw?: string;
}

@Injectable()
export class SpraycodeOcrService {
  private rapidOcrUrl: string;

  constructor(
    private config: NickelConfigService,
    private barcodeParser: BarcodeParserService,
  ) {
    this.rapidOcrUrl = this.config.rapidOcrUrl;
  }

  /**
   * v2.3.6 重构：识别喷码图片
   *
   * 数据源：25 位行业编码条形码（zxing-cpp 扫描）
   * 失败处理：直接抛 400，让用户重拍；OCR 文本不用
   *
   * 注意：喷码图通常不含完整条形码（喷码是钢印/激光打标，不是仪器上的条码）。
   * 这是喷码 OCR 全空的根本原因 — 当前架构需要在喷码图也采集到 25 位条码才能识别。
   * 若用户的喷码区域没有条形码，正确做法应该是让用户重新拍摄包含条形码的喷码图。
   */
  async recognizeSpraycode(imageBuffer: Buffer): Promise<SpraycodeFields> {
    const start = Date.now();
    console.log('[SpraycodeOCR] 开始喷码识别（条码优先）');

    const { lines, barcodes, ocrLatencyMs, barcodeLatencyMs, barcodeCount } = await callOcrFull(
      imageBuffer,
      this.rapidOcrUrl,
    );

    const rawBarcode = pickBestBarcode(barcodes);
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

    // === 失败分支：扫码结果异常（不抛异常，让上层决定） ===
    if (!cleanedBarcode) {
      const reason = !rawBarcode
        ? `未扫到条码（zxing 识别出 ${barcodeCount} 个码，均非 25 位行业编码）`
        : `条码格式无效：期望 25 位数字，实际长度 ${rawBarcode.replace(/\D/g, '').length}`;
      console.warn('[SpraycodeOCR]', reason);
      return {
        batchNo: null,
        packNo: null,
        productionDate: null,
        netWeight: null,
        grossWeight: null,
        pieces: null,
        _barcodeRaw: rawBarcode ?? undefined,
        _warning: rawBarcode
          ? '喷码图条码格式无效，请重新拍摄'
          : '喷码图未检测到 25 位行业编码条码，请重新拍摄',
        _ocrMeta: meta,
      };
    }

    const parsed = this.barcodeParser.parse(cleanedBarcode);
    if (!parsed || !parsed.parsed) {
      console.warn('[SpraycodeOCR] 25 位条码解析失败:', parsed?.message, '→', cleanedBarcode);
      return {
        batchNo: null,
        packNo: null,
        productionDate: null,
        netWeight: null,
        grossWeight: null,
        pieces: null,
        _barcodeRaw: cleanedBarcode,
        _warning: `喷码条码解析失败：${parsed?.message || '未知错误'}`,
        _ocrMeta: meta,
      };
    }

    // === 成功：用 BarcodeParsed 反推喷码字段 ===
    const yearShort = parsed.productionDate ? parsed.productionDate.slice(2, 4) : '';
    const batchNo = `${yearShort}-${parsed.workshopCode}-${parsed.batchNoSuffix}${parsed.batchNoSuffixLetter}`;

    const latency = Date.now() - start;
    console.log('[SpraycodeOCR] 喷码识别完成，耗时:', latency, 'ms, 批号:', batchNo);

    return {
      batchNo,
      packNo: parsed.expectedPackNo,
      productionDate: parsed.productionDate,
      netWeight: parsed.expectedNetWeight,
      grossWeight: null, // 条码无
      pieces: null, // 条码无
      _barcodeRaw: parsed.barcode,
      _ocrMeta: meta,
    };
  }
}
