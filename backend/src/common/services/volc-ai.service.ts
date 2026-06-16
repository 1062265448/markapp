import { Injectable, Logger } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { NickelPromptService } from './nickel-prompt.service';
import { VisionAIBaseService } from './vision-ai-base.service';

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;
const REQUEST_TIMEOUT = 15000;

@Injectable()
export class VolcAIService extends VisionAIBaseService {
  protected readonly logger = new Logger(VolcAIService.name);

  constructor(config: NickelConfigService, promptService: NickelPromptService) {
    super(config, promptService);
  }

  protected get apiKey(): string { return this.config.volcApiKey; }
  protected get apiUrl(): string { return this.config.volcBaseUrl; }
  protected get modelName(): string { return this.config.volcModel; }
  protected get maxRetries(): number { return MAX_RETRIES; }
  protected get retryDelayMs(): number { return RETRY_DELAY_MS; }
  protected get requestTimeout(): number { return REQUEST_TIMEOUT; }
}
