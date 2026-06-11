import { Injectable } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { NickelPromptService } from './nickel-prompt.service';
import { parseWithFallback } from './json-parser.service';
import axios from 'axios';

@Injectable()
export class GlmAIService {
  private apiKeys: string[];
  private apiUrl: string;
  private maxRetries = 3;
  private currentKeyIndex = 0;

  constructor(
    private config: NickelConfigService,
    private promptService: NickelPromptService,
  ) {
    this.apiKeys = [
      this.config.glmApiKey,
      this.config.glmApiKey2,
      this.config.glmApiKey3,
    ].filter(k => k.length > 0);
    this.apiUrl = this.config.glmBaseUrl;
  }

  /**
   * 获取当前API Key
   */
  private _getCurrentKey(): string {
    return this.apiKeys[this.currentKeyIndex % this.apiKeys.length];
  }

  /**
   * 切换到下一个API Key
   */
  private _rotateKey(): boolean {
    if (this.apiKeys.length <= 1) return false;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    console.log(`[GLM] 切换到备用Key #${this.currentKeyIndex + 1}`);
    return true;
  }

  /**
   * 判断是否为可重试错误
   */
  private _isRetryableError(err: any): boolean {
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) return true;
    if (err.code === 'ECONNREFUSED' || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') return true;
    if (err.response?.status === 429) return true;
    const code = err.response?.data?.error?.code;
    if (code === 1302 || code === 1305) return true;
    if (err.response?.status >= 500 && err.response?.status < 600) return true;
    return false;
  }

  /**
   * 指数退避延时
   */
  private async _delay(attempt: number): Promise<void> {
    const ms = Math.min(1000 * Math.pow(2, attempt), 8000);
    return new Promise(r => setTimeout(r, ms + Math.random() * 500));
  }

  /**
   * 识别镍板标签（带限流重试）
   */
  async recognizeNickelLabel(imageBuffer: Buffer): Promise<any> {
    if (this.apiKeys.length === 0) {
      throw new Error('GLM_API_KEY未配置');
    }

    const base64Image = imageBuffer.toString('base64');
    const prompt = this.promptService.buildNickelPrompt();
    let lastError: any = null;
    const retryStart = Date.now();
    const maxRetryWindow = 15000;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (Date.now() - retryStart > maxRetryWindow) {
        break;
      }

      try {
        if (attempt > 0) {
          await this._delay(attempt);
        }

        const currentTimeout = attempt === 0 ? 15000 : 5000;
        const currentKey = this._getCurrentKey();

        const response = await axios.post(
          this.apiUrl,
          {
            model: 'glm-4.6v-flash',
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
            headers: {
              Authorization: `Bearer ${currentKey}`,
              'Content-Type': 'application/json',
            },
            timeout: currentTimeout,
          },
        );

        const content = response.data.choices?.[0]?.message?.content || '';
        return parseWithFallback(content, { errorKey: 'error' });
      } catch (err) {
        lastError = err;
        const isRetryable = this._isRetryableError(err);
        const is429 = err.response?.status === 429 ||
          err.response?.data?.error?.code === 1302 ||
          err.response?.data?.error?.code === 1305;

        if (is429 && this._rotateKey()) continue;
        if (!isRetryable) break;
      }
    }

    const finalMsg = lastError?.response?.data?.error?.message || lastError?.message || '未知错误';
    throw new Error(`GLM调用失败(重试${this.maxRetries}次): ${finalMsg}`);
  }
}
