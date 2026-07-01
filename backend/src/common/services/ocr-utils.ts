/**
 * OCR 共享工具方法
 * 提取自 LabelOcrService 和 SpraycodeOcrService 的重复逻辑
 */
import { Logger } from '@nestjs/common';
import axios from 'axios';

// OCR /ocr/full 端点返回的单张图片结果
export interface OcrFullResult {
  lines: Array<{ text: string; confidence: number }>;
  lineCount: number;
  ocrLatencyMs: number;
  barcodes: Array<{ text: string; format: string }>;
  barcodeCount: number;
  barcodeLatencyMs: number;
}

// OCR /ocr/text 端点返回的单张图片结果
export interface OcrTextResult {
  lines: Array<{ text: string; confidence: number }>;
  lineCount: number;
  latencyMs: number;
}

// 模块级 logger（工具函数静态调用，无法注入实例）
const ocrUtilsLogger = new Logger('OcrUtils');

/**
 * OCR 字符纠错映射（O→0, o→0, l→1, I→1）
 * 注意：不处理 J/j→1，因为 J/t/s 是镍板批号/包号的合法后缀
 */
export function normalizeDigits(str: string): string {
  return str.replace(/[OolI]/g, ch => {
    const map: Record<string, string> = { 'O': '0', 'o': '0', 'l': '1', 'I': '1' };
    return map[ch] || ch;
  });
}

/**
 * 标准化批号格式
 * 保留合法后缀 J/t/s，仅标准化连字符和数字纠错
 */
export function normalizeBatchNo(raw: string): string {
  let s = raw.trim();
  s = s.replace(/\p{Pd}/gu, '-');  // 所有 Unicode dash 类字符 → 半角连字符
  // 仅对数字部分做纠错，保留尾缀 J/j/T/t/S/s
  s = s.replace(/(\d)/g, (m) => normalizeDigits(m));
  // 统一尾缀为大写
  s = s.replace(/([JjTtSs])$/, (m) => m.toUpperCase());
  return s;
}

/**
 * 标准化日期格式为 YYYY-MM-DD
 */
export function normalizeDate(raw: string): string {
  let s = raw.trim().replace(/[\/.]/g, '-');
  s = normalizeDigits(s);
  const parts = s.split('-');
  if (parts.length === 3) {
    if (parts[0].length === 2) parts[0] = '20' + parts[0];
    if (parts[1].length === 1) parts[1] = '0' + parts[1];
    if (parts[2].length === 1) parts[2] = '0' + parts[2];
    return parts.join('-');
  }
  return s;
}

/**
 * 标准化重量值（去除单位、千分位、纠错字符）
 */
export function normalizeWeight(raw: string): number | null {
  let s = raw.trim()
    .replace(/\s*(Kg|KG|kg)\s*/gi, '')
    .replace(/,/g, '');
  s = normalizeDigits(s);
  const num = parseFloat(s);
  return isNaN(num) ? null : num;
}

/**
 * 从条码扫描结果中选择最佳条码
 * 优先选择含 25 位数字行业编码（连续或 6 段空格分隔）的结果
 */
export function pickBestBarcode(barcodes: Array<{ text: string; format: string }>): string | null {
  if (barcodes.length === 0) return null;

  // 优先：25 位行业编码（连续数字）
  for (const b of barcodes) {
    if (/^\d{25}$/.test(b.text.trim())) return b.text.trim();
  }

  // 次选：6 段空格分隔的数字（拼起来应等于 25 位）
  for (const b of barcodes) {
    const parts = b.text.trim().split(/\s+/);
    if (parts.length === 6 && parts.join('').length === 25 && /^\d+$/.test(parts.join(''))) {
      return b.text.trim();
    }
  }

  // 兜底：含数字且长度 ≥ 20 的码（镍板数字码格式）
  const digitPattern = /^[\d\s]{20,}$/;
  const best = barcodes.find(b => digitPattern.test(b.text));
  if (best) return best.text.trim();

  // 最后：选择最长的条码
  const sorted = [...barcodes].sort((a, b) => b.text.length - a.text.length);
  return sorted[0].text.trim();
}

/**
 * 将任意条码字符串归一化为 25 位连续数字（去除所有非数字字符）
 * 例如 "123 456 789..." → "123456789..."
 * 解析失败返回 null（长度不是 25）
 */
export function normalize25DigitBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  return digits.length === 25 ? digits : null;
}

/**
 * 调用 OCR 服务 /ocr/full 端点（文本 + 条码扫描）
 * 失败时自动降级到 /ocr/text
 */
export async function callOcrFull(
  imageBuffer: Buffer,
  rapidOcrUrl: string,
): Promise<OcrFullResult> {
  const base64 = imageBuffer.toString('base64');

  try {
    const response = await callOcrPost(rapidOcrUrl + '/ocr/full', base64, 15000);
    if (response) {
      const result = response as OcrFullResult;
      if (result.lines && result.lines.length > 0) {
        return result;
      }
    }
  } catch (e) {
    ocrUtilsLogger.warn(`/ocr/full 调用失败: ${(e as Error).message}`);
    // 降级到 /ocr/text（仅文本，无条码）
    try {
      const fallbackResponse = await callOcrPost(rapidOcrUrl + '/ocr/text', base64, 10000);
      if (fallbackResponse) {
        const item = fallbackResponse;
        return {
          lines: item.lines || [],
          lineCount: item.lineCount || 0,
          ocrLatencyMs: item.latencyMs || 0,
          barcodes: [],
          barcodeCount: 0,
          barcodeLatencyMs: 0,
        };
      }
    } catch (e2) {
      ocrUtilsLogger.warn(`/ocr/text 降级也失败: ${(e2 as Error).message}`);
    }
  }

  // 全部失败时返回空结果
  return {
    lines: [],
    lineCount: 0,
    ocrLatencyMs: 0,
    barcodes: [],
    barcodeCount: 0,
    barcodeLatencyMs: 0,
  };
}

// ── 内部辅助 ──

async function callOcrPost(url: string, base64: string, timeout: number): Promise<any> {
  const response = await axios.post(
    url,
    { images: [`data:image/jpeg;base64,${base64}`] },
    { timeout },
  );
  const result = response.data;
  if (result?.success && result?.data?.length > 0) {
    return result.data[0];
  }
  return null;
}
