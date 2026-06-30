import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../auth.service';

/**
 * 用户 JWT 守卫：检查 Authorization: Bearer <token>
 * 失败时抛 401（区别于 ApiKeyGuard 的设备级密钥）
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const auth = request.headers['authorization'];

    if (!auth || !/^Bearer\s+/i.test(auth)) {
      throw new UnauthorizedException('未登录');
    }
    const token = auth.replace(/^Bearer\s+/i, '').trim();
    const payload = this.authService.verify(token);
    if (!payload) {
      throw new UnauthorizedException('token 无效或已过期');
    }

    // 挂在 request.user 供下游使用
    (request as any).user = { id: payload.sub, username: payload.username };
    return true;
  }
}
