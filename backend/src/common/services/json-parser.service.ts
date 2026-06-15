import { Injectable } from '@nestjs/common';

/**
 * 清理和修复 JSON 字符串
 */
function cleanJsonString(str: string): string {
  let cleaned = str.trim();

  // 确保以 { 开头
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace > 0) {
    cleaned = cleaned.substring(firstBrace);
  }

  // 确保以 } 结尾
  const lastBrace = cleaned.lastIndexOf('}');
  if (lastBrace < cleaned.length - 1 && lastBrace !== -1) {
    cleaned = cleaned.substring(0, lastBrace + 1);
  }

  // 修复常见的 JSON 格式问题
  cleaned = cleaned
    .replace(/,\s*}/g, '}')
    .replace(/,\s*]/g, ']')
    .replace(/'([^']*)'\s*:/g, '"$1":')  // 修复单引号 key
    .replace(/:\s*'([^']*)'/g, ': "$1"');  // 修复单引号 value

  return cleaned;
}

/**
 * 尝试解析 JSON，成功则检查 errorKey
 * 返回 parsed 对象或 null（解析失败）
 */
function tryParse(str: string, errorKey?: string): any | null {
  try {
    const parsed = JSON.parse(str);
    if (errorKey && parsed[errorKey]) {
      throw new Error(parsed.message || parsed[errorKey]);
    }
    return parsed;
  } catch (e) {
    // 如果是 errorKey 触发的错误，直接抛出
    if (errorKey && e instanceof Error && !e.message.includes('Unexpected token') && !e.message.includes('is not valid JSON')) {
      throw e;
    }
    return null;
  }
}

/**
 * 多层兜底 JSON 解析
 * 第1层: 直接 JSON.parse
 * 第2层: 提取 markdown 代码块中的 JSON
 * 第3层: 定位首尾花括号提取
 * 第4层: cleanJsonString 修复后重试
 */
export function parseWithFallback(content: string, options: { errorKey?: string } = {}): any {
  const { errorKey } = options;

  // 第1层: 直接解析
  const r1 = tryParse(content, errorKey);
  if (r1 !== null) return r1;

  // 第2层: 提取 markdown 代码块中的 JSON
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const r2 = tryParse(codeBlockMatch[1].trim(), errorKey);
    if (r2 !== null) return r2;
  }

  // 第3层: 定位首尾花括号
  const firstBrace = content.indexOf('{');
  const lastBrace = content.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const r3 = tryParse(content.slice(firstBrace, lastBrace + 1), errorKey);
    if (r3 !== null) return r3;
  }

  // 第4层: cleanJsonString 修复后重试
  const cleaned = cleanJsonString(content);
  const r4 = tryParse(cleaned, errorKey);
  if (r4 !== null) return r4;

  throw new Error('AI返回格式异常，无法解析为JSON');
}

@Injectable()
export class JsonParserService {
  parseWithFallback(content: string, options: { errorKey?: string } = {}): any {
    return parseWithFallback(content, options);
  }

  cleanJsonString(str: string): string {
    return cleanJsonString(str);
  }
}
