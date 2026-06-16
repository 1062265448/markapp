import { Injectable, Logger } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { NickelPromptService } from './nickel-prompt.service';
import { VisionAIBaseService } from './vision-ai-base.service';

const MAX_RETRIES = 3;
const MAX_RETRY_WINDOW = 15000;

@Injectable()
export class GlmAIService extends VisionAIBaseService {
  protected readonly logger = new Logger(GlmAIService.name);
  private apiKeys: string[];
  private currentKeyIndex = 0;

  constructor(config: NickelConfigService, promptService: NickelPromptService) {
    super(config, promptService);
    this.apiKeys = [
      this.config.glmApiKey,
      this.config.glmApiKey2,
      this.config.glmApiKey3,
    ].filter(k => k.length > 0);
  }

  protected get apiKey(): string { return this.apiKeys[this.currentKeyIndex % this.apiKeys.length] || ''; }
  protected get apiUrl(): string { return this.config.glmBaseUrl; }
  protected get modelName(): string { return 'glm-4.6v-flash'; }
  protected get maxRetries(): number { return MAX_RETRIES; }
  protected get retryDelayMs(): number { return 1000; }
  protected get requestTimeout(): number { return 15000; }

  /**
   * 覆盖重试逻辑：支持 Key 轮换 + 指数退避 + 时间窗口
   */
  async recognizeNickelLabel(imageBuffer: Buffer): Promise<any> {
    if (this.apiKeys.length === 0) {
      throw new Error('GLM_API_KEY未配置');
    }

    const base64Image = imageBuffer.toString('base64');
    const prompt = this.promptService.buildNickelPrompt();
    let lastError: any = null;
    const retryStart = Date.now();

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (Date.now() - retryStart > MAX_RETRY_WINDOW) break;

      try {
        if (attempt > 0) {
          await this.glmDelay(attempt);
        }

        const currentTimeout = attempt === 0 ? 15000 : 5000;
        const currentKey = this.apiKeys[this.currentKeyIndex % this.apiKeys.length];

        const response = await this.callApi(currentKey, base64Image, prompt, currentTimeout);
        const content = response.data.choices?.[0]?.message?.content || '';
        const { parseWithFallback } = await import('./json-parser.service');
        return parseWithFallback(content, { errorKey: 'error' });
      } catch (err) {
        lastError = err;
        const is429 = (err as any).response?.status === 429 ||
          (err as any).response?.data?.error?.code === 1302 ||
          (err as any).response?.data?.error?.code === 1305;

        if (is429 && this.rotateKey()) continue;
        if (!this.isRetryable(err as Error)) break;
      }
    }

    const finalMsg = lastError?.response?.data?.error?.message || lastError?.message || '未知错误';
    throw new Error(`GLM调用失败(重试${this.maxRetries}次): ${finalMsg}`);
  }

  private rotateKey(): boolean {
    if (this.apiKeys.length <= 1) return false;
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;
    this.logger.log(`[GLM] 切换到备用Key #${this.currentKeyIndex + 1}`);
    return true;
  }

  private async glmDelay(attempt: number): Promise<void> {
    const ms = Math.min(1000 * Math.pow(2, attempt), 8000);
    await new Promise(r => setTimeout(r, ms + Math.random() * 500));
  }

  private async callApi(key: string, base64Image: string, prompt: string, timeout: number) {
    const axios = await import('axios');
    return axios.default.post(
      this.apiUrl,
      {
        model: this.modelName,
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
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
        },
        timeout,
      },
    );
  }
}
