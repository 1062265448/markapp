import { Injectable, Logger } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { NickelPromptService } from './nickel-prompt.service';
import { parseWithFallback } from './json-parser.service';
import { NickelLabelData } from '../../nickel/types/nickel.types';
import axios from 'axios';

/**
 * 视觉 AI 基类 — 封装 OpenAI 兼容 API 调用、重试、base64 编码
 */
export abstract class VisionAIBaseService {
  protected abstract readonly logger: Logger;
  protected abstract get apiKey(): string;
  protected abstract get apiUrl(): string;
  protected abstract get modelName(): string;
  protected abstract get maxRetries(): number;
  protected abstract get retryDelayMs(): number;
  protected abstract get requestTimeout(): number;

  constructor(
    protected config: NickelConfigService,
    protected promptService: NickelPromptService,
  ) {}

  /**
   * 识别镍板标签（含重试）
   */
  async recognizeNickelLabel(imageBuffer: Buffer): Promise<NickelLabelData> {
    if (!this.apiKey) {
      throw new Error(`${this.modelName} API Key 未配置`);
    }

    const base64Image = imageBuffer.toString('base64');
    const prompt = this.promptService.buildNickelPrompt();

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.warn(`${this.modelName} API 重试第 ${attempt} 次`);
          await this.retryDelay(attempt);
        }

        const response = await axios.post(
          this.apiUrl,
          {
            model: this.modelName,
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'image_url',
                    image_url: { url: `data:image/jpeg;base64,${base64Image}` },
                  },
                  { type: 'text', text: prompt },
                ],
              },
            ],
          },
          {
            headers: this.buildHeaders(),
            timeout: this.requestTimeout,
          },
        );

        const content = response.data.choices?.[0]?.message?.content || '';
        return parseWithFallback<NickelLabelData>(content, { errorKey: 'error' });
      } catch (e) {
        lastError = e as Error;
        this.logger.error(`${this.modelName} API 调用失败 (attempt ${attempt + 1}): ${lastError.message}`);
        if (!this.isRetryable(e as Error)) break;
      }
    }

    throw lastError || new Error(`${this.modelName} API 调用失败`);
  }

  /**
   * 构建请求头（子类可覆盖）
   */
  protected buildHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * 重试延时（线性退避）
   */
  protected async retryDelay(attempt: number): Promise<void> {
    await new Promise(r => setTimeout(r, this.retryDelayMs * attempt));
  }

  /**
   * 判断是否可重试
   */
  protected isRetryable(err: Error): boolean {
    const axiosErr = err as any;
    if (axiosErr.code === 'ECONNABORTED' || axiosErr.message?.includes('timeout')) return true;
    if (['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT'].includes(axiosErr.code)) return true;
    if (axiosErr.response?.status === 429) return true;
    if (axiosErr.response?.status >= 500 && axiosErr.response?.status < 600) return true;
    return false;
  }
}
