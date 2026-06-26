import { Injectable } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { NickelLabelData, OcrMeta } from '../../nickel/types/nickel.types';
import { WORKSHOP_MAP } from '../../nickel/types/nickel.types';
import {
  callOcrFull,
  normalizeDigits,
  normalizeBatchNo,
  normalizeDate,
  normalizeWeight,
  pickBestBarcode,
} from './ocr-utils';

// LabelOcrService 返回的完整结果
export interface LabelOcrResult {
  labelData: NickelLabelData;
  _ocrMeta: OcrMeta;
}

@Injectable()
export class LabelOcrService {
  private rapidOcrUrl: string;

  constructor(private config: NickelConfigService) {
    this.rapidOcrUrl = this.config.rapidOcrUrl;
  }

  /**
   * 识别标签图片 — 调用本地 OCR 服务获取文本 + 条码
   */
  async recognizeLabel(imageBuffer: Buffer, userBarcode?: string): Promise<LabelOcrResult> {
    const start = Date.now();
    console.log('[LabelOCR] 开始标签OCR识别');

    // 调用 /ocr/full 获取 OCR 文本 + 条码扫描
    const { lines, barcodes, ocrLatencyMs, barcodeLatencyMs, barcodeCount } = await callOcrFull(imageBuffer, this.rapidOcrUrl);

    // 从 OCR 文本提取所有标签字段
    const labelData = this.extractLabelFields(lines);

    // 从条码扫描结果获取 barcode 字符串（用户手动输入优先）
    const barcode = userBarcode || pickBestBarcode(barcodes);
    if (barcode) {
      labelData.barcode = barcode;
    }

    // 从条码推导 productName/brand（OCR 未识别时补充）
    if (!labelData.productName && barcode) {
      const parsed = this.tryParseBarcode(barcode);
      if (parsed?.workshopCode) {
        const workshopName = WORKSHOP_MAP[parsed.workshopCode] || '';
        // 从 "电解一车间-电解镍" 中提取最后一段作为 productName
        const parts = workshopName.split('-');
        labelData.productName = parts.length > 1 ? parts[parts.length - 1] : workshopName;
      }
    }
    if (!labelData.brand) labelData.brand = '金川';
    if (!labelData.standard) labelData.standard = 'GB/T 6516-2025';
    if (!labelData.address) labelData.address = '甘肃省金昌市金川区北京路10号';
    if (!labelData.weightBy) labelData.weightBy = '按净重计价';

    // 计算耗时
    const totalLatency = Date.now() - start;

    // 构建元数据
    const bestBarcode = barcodes.length > 0 ? barcodes[0] : null;
    const ocrMeta: OcrMeta = {
      engine: 'rapid-ocr + zxing-cpp',
      ocrLatency: ocrLatencyMs,
      barcodeLatency: barcodeLatencyMs,
      lineCount: lines.length,
      barcodeCount,
      barcodeFormat: bestBarcode?.format || null,
    };

    console.log('[LabelOCR] 标签OCR识别完成，耗时:', totalLatency, 'ms，行数:', lines.length, '条码:', barcodeCount);
    return { labelData, _ocrMeta: ocrMeta };
  }

  /**
   * 尝试解析条码字符串（简化版，仅提取 workshopCode）
   */
  private tryParseBarcode(barcode: string): { workshopCode: number } | null {
    const trimmed = barcode.trim();
    let productCode = '';

    if (trimmed.includes(' ')) {
      const parts = trimmed.split(/\s+/);
      if (parts.length === 6 && parts[4].length === 7) {
        productCode = parts[4];
      }
    } else if (/^\d{25}$/.test(trimmed)) {
      productCode = trimmed.slice(13, 20);
    }

    if (productCode.length === 7) {
      const workshopCode = parseInt(productCode[0], 10);
      if (workshopCode >= 1 && workshopCode <= 7) {
        return { workshopCode };
      }
    }

    return null;
  }

  /**
   * 从 OCR 文本行提取标签所有字段
   * 在 spraycode 字段基础上扩展标签特有字段
   */
  private extractLabelFields(lines: Array<{ text: string; confidence: number }>): NickelLabelData {
    const allText = lines.map(l => l.text).join('\n');

    const result: NickelLabelData = {
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
      barcode: null,
    };

    // === 标签特有字段 ===

    // 产品名称
    const productMatch = allText.match(/(电[解积][一二三]?车间[—\-]?(?:电解|电积)镍|电解镍|电积镍)/);
    if (productMatch) {
      // 从 "电解一车间-电解镍" 中提取产品名
      const p = productMatch[1];
      const dashIdx = p.lastIndexOf('-');
      result.productName = dashIdx >= 0 ? p.slice(dashIdx + 1) : p;
    }

    // 品牌
    const brandMatch = allText.match(/(金川|JINCHUAN)/i);
    if (brandMatch) result.brand = '金川';

    // 标准
    const standardMatch = allText.match(/(GB\/T\s*6516[\s\-]*\d{0,4})/i);
    if (standardMatch) {
      let s = standardMatch[1].replace(/\s+/g, '');
      // 补全年份
      if (!/\d{4}$/.test(s)) s += '-2025';
      result.standard = s;
    }

    // 地址
    const addrMatch = allText.match(/(甘肃省[一-龥]+(?:路|道|街|号)\S*)/);
    if (addrMatch) result.address = addrMatch[1].trim();

    // 计重方式
    const weightByMatch = allText.match(/(?:WEIGHT\s*BY|计重[:\s]*)\s*([一-龥A-Za-z\s]+)/i);
    if (weightByMatch) {
      result.weightBy = weightByMatch[1].trim();
    } else if (allText.match(/按净重/)) {
      result.weightBy = '按净重计价';
    }

    // === 喷码共有字段 ===

    // 批号 — 同时匹配中文 "批号：" 和英文 "BATCH NO."
    const batchMatch = allText.match(/批号[：:]\s*(\d{2}-\d-\d{3}[JjTtSs]?)/)
      || allText.match(/BATCH\s*NO\.?\s*[:.]?\s*(\d{2}-\d-\d{3}[J]?)/i)
      || allText.match(/(\d{2}-\d-\d{3}[JjTtSs]?)/);
    if (batchMatch) result.batchNo = normalizeBatchNo(batchMatch[1]);

    // 包号 — 同时匹配中文 "包号：" 和英文 "PACK NO."
    const packMatch = allText.match(/包号[：:]\s*(\d{1,3}[JjTtSs]?)/)
      || allText.match(/PACK\s*NO\.?\s*[:.]?\s*(\d{1,3})/i)
      || allText.match(/PACK\s*[:.]?\s*(\d{1,3})/i);
    if (packMatch) result.packNo = normalizeDigits(packMatch[1]);

    // 日期 — 同时匹配中文 "生产日期：" 和英文 "Date:"
    const dateMatch = allText.match(/生产日期[：:]\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/)
      || allText.match(/Date\s*[:.]?\s*(\d{4}[-\/.]\d{1,2}[-\/.]\d{1,2})/i)
      || allText.match(/(\d{4}[-\/.]\d{2}[-\/.]\d{2})/);
    if (dateMatch) result.productionDate = normalizeDate(dateMatch[1]);

    // 净重 — 同时匹配中文 "净重(Kg)：" 和英文 "NET:"
    const netMatch = allText.match(/净重[（(]Kg[)）][：:/]?\s*([\d,.]+)/)
      || allText.match(/NET\s*[:.]?\s*([\d,.]+)\s*(?:Kg|KG|kg)?/i)
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
