import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NickelConfigService {
  constructor(private configService: ConfigService) {}

  get qwenApiKey(): string {
    return this.configService.get<string>('QWEN_API_KEY', '');
  }

  get qwenBaseUrl(): string {
    return (
      this.configService.get<string>('QWEN_BASE_URL') ||
      'https://dashscope.aliyuncs.com/compatible-mode/v1'
    );
  }

  get volcApiKey(): string {
    return this.configService.get<string>('VOLC_API_KEY', '');
  }

  get volcBaseUrl(): string {
    return (
      this.configService.get<string>('VOLC_BASE_URL') ||
      'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
    );
  }

  get volcModel(): string {
    return (
      this.configService.get<string>('VOLC_MODEL') ||
      'doubao-1-5-vision-pro-32k-250115'
    );
  }

  get glmApiKey(): string {
    return this.configService.get<string>('GLM_API_KEY', '');
  }

  get glmApiKey2(): string {
    return this.configService.get<string>('GLM_API_KEY_2', '');
  }

  get glmApiKey3(): string {
    return this.configService.get<string>('GLM_API_KEY_3', '');
  }

  get glmBaseUrl(): string {
    return (
      this.configService.get<string>('GLM_BASE_URL') ||
      'https://open.bigmodel.cn/api/paas/v4/chat/completions'
    );
  }

  get rapidOcrUrl(): string {
    return this.configService.get<string>('RAPID_OCR_URL', 'http://localhost:8866');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3003);
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get rateLimitWindow(): number {
    return this.configService.get<number>('RATE_LIMIT_WINDOW', 60000);
  }

  get rateLimitMax(): number {
    return this.configService.get<number>('RATE_LIMIT_MAX', 30);
  }

  get maxImageSize(): number {
    return this.configService.get<number>('MAX_IMAGE_SIZE', 10485760);
  }

  isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }
}
