import { Injectable } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { OcrMeta } from '../../nickel/types/nickel.types';
import axios from 'axios';

interface SpraycodeFields {
  batchNo: string | null;
  packNo: string | null;
  productionDate: string | null;
  netWeight: number | null;
  grossWeight: number | null;
  pieces: number | null;
  _ocrMeta?: OcrMeta;
}

// OCR /ocr/full 端点返回的单张图片结果
interface OcrFullResult {
  lines: Array<{ text: string; confidence: number }>;
  lineCount: number;
  ocrLatencyMs: number;
  barcodes: Array<{ text: string; format: string }>;
  barcodeCount: number;
  barcodeLatencyMs: number;
}

@Injectable()
export class SpraycodeOcrService {
  private rapidOcrUrl: string;

  constructor(private config: NickelConfigService) {
    this.rapidOcrUrl = this.config.rapidOcrUrl;
  }

  /**
   * 识别喷码图片 - 调用本地 OCR 服务（RapidOCR + 条码扫描）
   */
  async recognizeSpraycode(imageBuffer: Buffer): Promise<SpraycodeFields> {
    const start = Date.now();
    console.log('[SpraycodeOCR] 开始喷码识别');

    let lines: Array<{ text: string; confidence: number }> = [];
    let barcodes: Array<{ text: string; format: string }> = [];
    let engine = 'none';
    let ocrLatencyMs = 0;
    let barcodeLatencyMs = 0;
    let barcodeCount = 0;

    // 主引擎: 调用 OCR /ocr/full 端点（文本 + 条码）
    try {
      console.log('[SpraycodeOCR] 调用OCR服务:', this.rapidOcrUrl + '/ocr/full');
      const base64 = imageBuffer.toString('base64');
      const response = await axios.post(
        this.rapidOcrUrl + '/ocr/full',
        { images: [`data:image/jpeg;base64,${base64}`] },
        { timeout: 15000 },
      );

      const ocrResult = response.data;
      if (ocrResult?.success && ocrResult?.data?.length > 0) {
        const item: OcrFullResult = ocrResult.data[0];
        lines = item.lines || [];
        barcodes = item.barcodes || [];
        ocrLatencyMs = item.ocrLatencyMs || 0;
        barcodeLatencyMs = item.barcodeLatencyMs || 0;
        barcodeCount = item.barcodeCount || 0;
        engine = 'rapid-ocr + zxing-cpp';
        console.log('[SpraycodeOCR] OCR成功，识别', lines.length, '行，条码', barcodeCount);
      }
    } catch (e) {
      console.warn('[SpraycodeOCR] OCR /ocr/full 调用失败:', (e as Error).message);
    }

    // 降级: 尝试 /ocr/text（仅文本，无条码）
    if (lines.length === 0) {
      try {
        console.log('[SpraycodeOCR] 降级到 /ocr/text...');
        const base64 = imageBuffer.toString('base64');
        const response = await axios.post(
          this.rapidOcrUrl + '/ocr/text',
          { images: [`data:image/jpeg;base64,${base64}`] },
          { timeout: 10000 },
        );

        const ocrResult = response.data;
        if (ocrResult?.success && ocrResult?.data?.length > 0) {
          const item = ocrResult.data[0];
          lines = item.lines || [];
          ocrLatencyMs = item.latencyMs || 0;
          engine = 'rapid-ocr';
          console.log('[SpraycodeOCR] /ocr/text 降级成功，识别', lines.length, '行');
        }
      } catch (e) {
        console.warn('[SpraycodeOCR] /ocr/text 降级也失败:', (e as Error).message);
      }
    }

    if (lines.length === 0) {
      throw new Error('所有OCR引擎均识别失败');
    }

    const fields = this._extractFields(lines);
    const latency = Date.now() - start;

    // 如果有条码扫描结果且 OCR 文本未提取到批号/包号，从条码补充
    if (barcodes.length > 0) {
      const bestBarcode = this._pickBestBarcode(barcodes);
      if (bestBarcode) {
        const parsed = this._tryParseBarcode(bestBarcode);
        if (parsed) {
          // 条码结果作为补充（OCR 文本提取优先）
          if (!fields.batchNo && parsed.batchNo) fields.batchNo = parsed.batchNo;
          if (!fields.packNo && parsed.packNo) fields.packNo = parsed.packNo;
          if (!fields.productionDate && parsed.productionDate) fields.productionDate = parsed.productionDate;
          if (!fields.netWeight && parsed.netWeight !== null) fields.netWeight = parsed.netWeight;
        }
      }
    }

    fields._ocrMeta = {
      engine,
      ocrLatency: ocrLatencyMs,
      barcodeLatency: barcodeLatencyMs,
      lineCount: lines.length,
      barcodeCount,
      barcodeFormat: barcodes.length > 0 ? barcodes[0].format : null,
    };

    console.log('[SpraycodeOCR] 字段提取完成，耗时:', latency, 'ms');
    return fields;
  }

  /**
   * 从条码扫描结果中选择最佳条码
   */
  private _pickBestBarcode(barcodes: Array<{ text: string; format: string }>): string | null {
    if (barcodes.length === 0) return null;

    // 优先选择包含 6 段或 25 位数字的条码
    const digitPattern = /^[\d\s]{20,}$/;
    const best = barcodes.find(b => digitPattern.test(b.text));
    if (best) return best.text.trim();

    // 其次选择最长的条码
    const sorted = [...barcodes].sort((a, b) => b.text.length - a.text.length);
    return sorted[0].text.trim();
  }

  /**
   * 尝试解析条码字符串为喷码字段
   */
  private _tryParseBarcode(barcode: string): { batchNo: string | null; packNo: string | null; productionDate: string | null; netWeight: number | null } | null {
    const trimmed = barcode.trim();
    let parts: string[];

    if (trimmed.includes(' ')) {
      parts = trimmed.split(/\s+/);
    } else if (/^\d{25}$/.test(trimmed)) {
      parts = [
        trimmed.slice(0, 3),
        trimmed.slice(3, 5),
        trimmed.slice(5, 7),
        trimmed.slice(7, 13),
        trimmed.slice(13, 20),
        trimmed.slice(20, 25),
      ];
    } else {
      return null;
    }

    if (parts.length !== 6) return null;

    const productCode = parts[4];
    if (productCode.length !== 7) return null;

    const workshopCode = parseInt(productCode[0], 10);
    const batchNoSuffix = productCode.slice(1, 4);
    const packCode = parseInt(productCode.slice(4), 10);
    const weightCode = parseInt(parts[5], 10);

    // 从日期代码提取日期
    const dateCode = parts[3];
    if (dateCode.length !== 6) return null;
    const productionDate = `20${dateCode.slice(0, 2)}-${dateCode.slice(2, 4)}-${dateCode.slice(4, 6)}`;

    return {
      batchNo: `${dateCode.slice(0, 2)}-${workshopCode}-${batchNoSuffix}`,
      packNo: packCode.toString(),
      productionDate,
      netWeight: weightCode / 10,
    };
  }

  /**
   * 从OCR文本行提取喷码字段
   */
  private _extractFields(lines: Array<{ text: string; confidence: number }>): SpraycodeFields {
    const allText = lines.map(l => l.text).join('\n');

    const result: SpraycodeFields = {
      batchNo: null,
      packNo: null,
      productionDate: null,
      netWeight: null,
      grossWeight: null,
      pieces: null,
    };

    // 批号
    const batchMatch = allText.match(/BATCH\s*NO\.?\s*[:.]?\s*(\d{2}-\d-\d{3}[J]?)/i)
      || allText.match(/(\d{2}-\d-\d{3}J?)/);
    if (batchMatch) result.batchNo = this._normalizeBatchNo(batchMatch[1]);

    // 包号
    const packMatch = allText.match(/PACK\s*NO\.?\s*[:.]?\s*(\d{1,3})/i)
      || allText.match(/PACK\s*[:.]?\s*(\d{1,3})/i);
    if (packMatch) result.packNo = this._normalizeDigits(packMatch[1]);

    // 日期
    const dateMatch = allText.match(/Date\s*[:.]?\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i)
      || allText.match(/(\d{4}[-\/.]\d{2}[-\/.]\d{2})/);
    if (dateMatch) result.productionDate = this._normalizeDate(dateMatch[1]);

    // 净重
    const netMatch = allText.match(/NET\s*[:.]?\s*([\d,.]+)\s*(?:Kg|KG|kg)?/i)
      || allText.match(/NET\s*[:.]?\s*(\d+)/i);
    if (netMatch) result.netWeight = this._normalizeWeight(netMatch[1]);

    // 毛重
    const grossMatch = allText.match(/Gross\s*[:.]?\s*([\d,.]+)\s*(?:Kg|KG|kg)?/i);
    if (grossMatch) result.grossWeight = this._normalizeWeight(grossMatch[1]);

    // 块数
    const piecesMatch = allText.match(/PIECES\s*[:.]?\s*(\d+)/i)
      || allText.match(/PCS\s*[:.]?\s*(\d+)/i);
    if (piecesMatch) result.pieces = parseInt(this._normalizeDigits(piecesMatch[1]), 10);

    return result;
  }

  private _normalizeDigits(str: string): string {
    return str.replace(/[OolI]/g, ch => {
      const map: Record<string, string> = { 'O': '0', 'o': '0', 'l': '1', 'I': '1' };
      return map[ch] || ch;
    });
  }

  private _normalizeBatchNo(raw: string): string {
    let s = raw.trim();
    s = s.replace(/[—–‐]/g, '-');
    s = s.replace(/(\d)/g, (m) => this._normalizeDigits(m));
    return s;
  }

  private _normalizeDate(raw: string): string {
    let s = raw.trim().replace(/[\/.]/g, '-');
    s = this._normalizeDigits(s);
    const parts = s.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 2) parts[0] = '20' + parts[0];
      if (parts[1].length === 1) parts[1] = '0' + parts[1];
      if (parts[2].length === 1) parts[2] = '0' + parts[2];
      return parts.join('-');
    }
    return s;
  }

  private _normalizeWeight(raw: string): number | null {
    let s = raw.trim()
      .replace(/\s*(Kg|KG|kg)\s*/gi, '')
      .replace(/,/g, '');
    s = this._normalizeDigits(s);
    const num = parseFloat(s);
    return isNaN(num) ? null : num;
  }
}
