import { Injectable, Logger } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { NickelPromptService } from './nickel-prompt.service';
import { VisionAIBaseService } from './vision-ai-base.service';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT = 15000;

@Injectable()
export class QwenAIService extends VisionAIBaseService {
  protected readonly logger = new Logger(QwenAIService.name);

  constructor(config: NickelConfigService, promptService: NickelPromptService) {
    super(config, promptService);
  }

  protected get apiKey(): string { return this.config.qwenApiKey; }
  protected get apiUrl(): string {
    return this.config.qwenBaseUrl.endsWith('/chat/completions')
      ? this.config.qwenBaseUrl
      : this.config.qwenBaseUrl + '/chat/completions';
  }
  protected get modelName(): string { return 'qwen-vl-ocr'; }
  protected get maxRetries(): number { return MAX_RETRIES; }
  protected get retryDelayMs(): number { return RETRY_DELAY_MS; }
  protected get requestTimeout(): number { return REQUEST_TIMEOUT; }
}
