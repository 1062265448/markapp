import { Injectable } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { OcrMeta } from '../../nickel/types/nickel.types';
import {
  callOcrFull,
  normalizeDigits,
  normalizeBatchNo,
  normalizeDate,
  normalizeWeight,
  pickBestBarcode,
} from './ocr-utils';

interface SpraycodeFields {
  batchNo: string | null;
  packNo: string | null;
  productionDate: string | null;
  netWeight: number | null;
  grossWeight: number | null;
  pieces: number | null;
  _ocrMeta?: OcrMeta;
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

    // 调用共享 OCR 工具（主引擎 + 降级）
    const { lines, barcodes, ocrLatencyMs, barcodeLatencyMs, barcodeCount } = await callOcrFull(imageBuffer, this.rapidOcrUrl);

    if (lines.length === 0) {
      throw new Error('所有OCR引擎均识别失败');
    }

    const fields = this._extractFields(lines);
    const latency = Date.now() - start;

    // 如果有条码扫描结果且 OCR 文本未提取到批号/包号，从条码补充
    if (barcodes.length > 0) {
      const bestBarcode = pickBestBarcode(barcodes);
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

    const engine = barcodeCount > 0 ? 'rapid-ocr + zxing-cpp' : 'rapid-ocr';
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
    if (batchMatch) result.batchNo = normalizeBatchNo(batchMatch[1]);

    // 包号
    const packMatch = allText.match(/PACK\s*NO\.?\s*[:.]?\s*(\d{1,3})/i)
      || allText.match(/PACK\s*[:.]?\s*(\d{1,3})/i);
    if (packMatch) result.packNo = normalizeDigits(packMatch[1]);

    // 日期
    const dateMatch = allText.match(/Date\s*[:.]?\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i)
      || allText.match(/(\d{4}[-\/.]\d{2}[-\/.]\d{2})/);
    if (dateMatch) result.productionDate = normalizeDate(dateMatch[1]);

    // 净重
    const netMatch = allText.match(/NET\s*[:.]?\s*([\d,.]+)\s*(?:Kg|KG|kg)?/i)
      || allText.match(/NET\s*[:.]?\s*(\d+)/i);
    if (netMatch) result.netWeight = normalizeWeight(netMatch[1]);

    // 毛重
    const grossMatch = allText.match(/Gross\s*[:.]?\s*([\d,.]+)\s*(?:Kg|KG|kg)?/i);
    if (grossMatch) result.grossWeight = normalizeWeight(grossMatch[1]);

    // 块数
    const piecesMatch = allText.match(/PIECES\s*[:.]?\s*(\d+)/i)
      || allText.match(/PCS\s*[:.]?\s*(\d+)/i);
    if (piecesMatch) result.pieces = parseInt(normalizeDigits(piecesMatch[1]), 10);

    return result;
  }
}
