import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RateLimitGuard implements CanActivate, OnModuleDestroy {
  private readonly requestMap = new Map<string, { count: number; resetAt: number }>();
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(private readonly configService: ConfigService) {
    this.startCleanup();
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.requestMap) {
        if (now > entry.resetAt) {
          this.requestMap.delete(key);
        }
      }
    }, 60000);
  }

  private getClientIp(request: any): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips = typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
      return ips[0].trim();
    }
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const ip = this.getClientIp(request);
    const windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW') || 60000;
    const maxRequests = this.configService.get<number>('RATE_LIMIT_MAX') || 30;

    const now = Date.now();
    const entry = this.requestMap.get(ip);

    if (!entry || now > entry.resetAt) {
      this.requestMap.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }

    entry.count++;
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        `请求过于频繁，请在 ${retryAfter} 秒后重试`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.requestMap.clear();
  }
}
