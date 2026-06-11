import { Injectable } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { NickelPromptService } from './nickel-prompt.service';
import { parseWithFallback } from './json-parser.service';
import axios from 'axios';

interface SpraycodeFields {
  batchNo: string | null;
  packNo: string | null;
  productionDate: string | null;
  netWeight: number | null;
  grossWeight: number | null;
  pieces: number | null;
  _aiMeta?: {
    ocrEngine: string;
    ocrLineCount: number;
    ocrLatency: number;
  };
}

@Injectable()
export class SpraycodeOcrService {
  private rapidOcrUrl: string;

  constructor(
    private config: NickelConfigService,
    private promptService: NickelPromptService,
  ) {
    this.rapidOcrUrl = this.config.rapidOcrUrl;
  }

  /**
   * 识别喷码图片 - 调用RapidOCR
   */
  async recognizeSpraycode(imageBuffer: Buffer): Promise<SpraycodeFields> {
    const start = Date.now();
    console.log('[SpraycodeOCR] 开始喷码识别');

    let lines: Array<{ text: string; confidence: number }> = [];
    let engine = 'none';

    // 主引擎: RapidOCR (服务器本地)
    try {
      console.log('[SpraycodeOCR] 调用RapidOCR:', this.rapidOcrUrl + '/ocr/text');
      const base64 = imageBuffer.toString('base64');
      const response = await axios.post(
        this.rapidOcrUrl + '/ocr/text',
        { images: [`data:image/jpeg;base64,${base64}`] },
        { timeout: 10000 },
      );

      const ocrResult = response.data;
      if (ocrResult?.data?.length > 0) {
        lines = ocrResult.data.map((item: any) => ({
          text: typeof item === 'string' ? item : (item.text || ''),
          confidence: 1.0,
        }));
        engine = 'rapid-ocr';
        console.log('[SpraycodeOCR] RapidOCR成功，识别', lines.length, '行');
      }
    } catch (e) {
      console.warn('[SpraycodeOCR] RapidOCR调用失败:', (e as Error).message);
    }

    // 降级: 用Qwen VL识别喷码
    if (lines.length === 0) {
      try {
        console.log('[SpraycodeOCR] 降级到Qwen VL...');
        const qwenResult = await this._callQwenForSpraycode(imageBuffer);
        if (qwenResult) {
          const fields: any = {};
          for (const key of ['batchNo', 'packNo', 'productionDate', 'netWeight', 'grossWeight', 'pieces']) {
            if (qwenResult[key] !== null && qwenResult[key] !== undefined) {
              fields[key] = qwenResult[key];
            }
          }
          fields._aiMeta = { ocrEngine: 'qwen-vl', ocrLineCount: 0, ocrLatency: Date.now() - start };
          const latency = Date.now() - start;
          console.log('[SpraycodeOCR] Qwen VL降级成功，耗时:', latency, 'ms');
          return fields as SpraycodeFields;
        }
      } catch (e) {
        console.warn('[SpraycodeOCR] Qwen VL降级也失败:', (e as Error).message);
      }
    }

    if (lines.length === 0) {
      throw new Error('所有OCR引擎均识别失败');
    }

    const fields = this._extractFields(lines);
    const latency = Date.now() - start;

    fields._aiMeta = {
      ocrEngine: engine,
      ocrLineCount: lines.length,
      ocrLatency: latency,
    };

    console.log('[SpraycodeOCR] 字段提取完成，耗时:', latency, 'ms');
    return fields;
  }

  /**
   * 用Qwen VL识别喷码
   */
  private async _callQwenForSpraycode(imageBuffer: Buffer): Promise<any> {
    const apiKey = this.config.qwenApiKey;
    if (!apiKey) return null;

    const base64Image = imageBuffer.toString('base64');
    const prompt = this.promptService.buildSpraycodePrompt();

    const apiUrl = this.config.qwenBaseUrl.endsWith('/chat/completions')
      ? this.config.qwenBaseUrl
      : this.config.qwenBaseUrl + '/chat/completions';

    const response = await axios.post(
      apiUrl,
      {
        model: 'qwen-vl-ocr',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
              { type: 'text', text: prompt },
            ],
          },
        ],
      },
      {
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        timeout: 10000,
      },
    );

    const content = response.data.choices?.[0]?.message?.content || '';
    try {
      return parseWithFallback(content);
    } catch {
      return null;
    }
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
