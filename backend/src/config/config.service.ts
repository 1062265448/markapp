import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NickelConfigService {
  constructor(private configService: ConfigService) {}

  get apiKey(): string {
    return this.configService.get<string>('API_KEY', '');
  }

  get rapidOcrUrl(): string {
    return this.configService.get<string>('RAPID_OCR_URL', 'http://localhost:8866');
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3003);
  }

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'production');
  }

  get apiKeyEnabled(): boolean {
    return this.configService.get<string>('API_KEY_ENABLED', 'true') === 'true';
  }

  get corsOrigin(): string {
    return this.configService.get<string>('CORS_ORIGIN', '');
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

  // MySQL
  get mysqlHost(): string {
    return this.configService.get<string>('MYSQL_HOST', 'localhost');
  }

  get mysqlPort(): number {
    return this.configService.get<number>('MYSQL_PORT', 3306);
  }

  get mysqlUsername(): string {
    return this.configService.get<string>('MYSQL_USERNAME', 'root');
  }

  get mysqlPassword(): string {
    return this.configService.get<string>('MYSQL_PASSWORD', '');
  }

  get mysqlDatabase(): string {
    return this.configService.get<string>('MYSQL_DATABASE', 'markapp');
  }

  // Image Storage
  get imageUploadDir(): string {
    return this.configService.get<string>('IMAGE_UPLOAD_DIR', 'uploads');
  }

  get imageRetentionDays(): number {
    return this.configService.get<number>('IMAGE_RETENTION_DAYS', 10);
  }

  isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }
}
