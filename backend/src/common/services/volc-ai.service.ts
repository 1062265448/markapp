import { Injectable, Logger } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { NickelPromptService } from './nickel-prompt.service';
import { parseWithFallback } from './json-parser.service';
import axios from 'axios';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

@Injectable()
export class VolcAIService {
  private readonly logger = new Logger(VolcAIService.name);
  private apiKey: string;
  private apiUrl: string;
  private model: string;

  constructor(
    private config: NickelConfigService,
    private promptService: NickelPromptService,
  ) {
    this.apiKey = this.config.volcApiKey;
    this.apiUrl = this.config.volcBaseUrl;
    this.model = this.config.volcModel;
  }

  /**
   * 识别镍板标签（含重试）
   */
  async recognizeNickelLabel(imageBuffer: Buffer): Promise<any> {
    if (!this.apiKey) {
      throw new Error('VOLC_API_KEY未配置');
    }

    const base64Image = imageBuffer.toString('base64');
    const prompt = this.promptService.buildNickelPrompt();

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          this.logger.warn(`Volc API 重试第 ${attempt} 次`);
          await new Promise(r => setTimeout(r, RETRY_DELAY_MS * attempt));
        }

        const response = await axios.post(
          this.apiUrl,
          {
            model: this.model,
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
              Authorization: `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 15000,
          },
        );

        const content = response.data.choices?.[0]?.message?.content || '';
        return parseWithFallback(content, { errorKey: 'error' });
      } catch (e) {
        lastError = e as Error;
        this.logger.error(`Volc API 调用失败 (attempt ${attempt + 1}): ${lastError.message}`);
      }
    }

    throw lastError || new Error('Volc API 调用失败');
  }
}
