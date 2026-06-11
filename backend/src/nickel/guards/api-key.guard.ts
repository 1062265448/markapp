import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const apiKeyEnabled = this.configService.get<string>('API_KEY_ENABLED', 'false');

    if (apiKeyEnabled !== 'true') {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('缺少API密钥');
    }

    const validApiKey = this.configService.get<string>('API_KEY');
    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('API密钥无效');
    }

    return true;
  }
}
