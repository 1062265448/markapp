import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { NickelConfigService } from '../../config/config.service';
import { timingSafeEqual } from 'crypto';

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: NickelConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> {
    if (!this.configService.apiKeyEnabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('缺少API密钥');
    }

    const validApiKey = this.configService.apiKey;
    if (!validApiKey) {
      throw new UnauthorizedException('服务端未配置API密钥');
    }

    if (!safeCompare(apiKey, validApiKey)) {
      throw new UnauthorizedException('API密钥无效');
    }

    return true;
  }
}
