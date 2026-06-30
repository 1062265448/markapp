import { Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { NickelConfigService } from '../config/config.service';

export interface AuthUser {
  id: string;
  username: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: AuthUser;
}

interface TokenPayload {
  sub: string;
  username: string;
  exp: number; // ms epoch
}

/**
 * 简单的 HMAC 签名 token（自包含 + 过期检查）
 *
 * 格式: base64url(payload).base64url(hmacSig)
 *   payload = JSON.stringify({ sub, username, exp })
 *   hmacSig = HMAC-SHA256(SECRET, base64url(payload))
 *
 * 演示用，不带 refresh、不存会话；生产建议替换为 jwt + DB 校验。
 */
@Injectable()
export class AuthService {
  private static readonly TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天
  private static readonly SECRET_FALLBACK = 'markapp-demo-secret-change-in-production';

  constructor(private readonly configService: NickelConfigService) {}

  /**
   * 校验用户名/密码并签发 token
   * 默认账号从环境变量读取（ADMIN_USERNAME / ADMIN_PASSWORD），
   * 未配置时回退到 demo 账号 admin / admin123
   */
  async login(username: string, password: string): Promise<LoginResponse> {
    const expectedUser = this.configService.adminUsername || 'admin';
    const expectedPass = this.configService.adminPassword || 'admin123';

    if (!this.safeEqual(username, expectedUser) || !this.safeEqual(password, expectedPass)) {
      // 故意模糊错误信息，避免用户名枚举
      throw new UnauthorizedException('用户名或密码错误');
    }

    const user: AuthUser = { id: '1', username };
    const expiresAt = Date.now() + AuthService.TOKEN_TTL_MS;
    const token = this.signToken({ sub: user.id, username: user.username, exp: expiresAt });

    return {
      access_token: token,
      token_type: 'Bearer',
      expires_in: Math.floor(AuthService.TOKEN_TTL_MS / 1000),
      user,
    };
  }

  /**
   * 验证 token 并返回用户；无效时返回 null
   */
  verify(token: string): TokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadB64, sigB64] = parts;
    const expectedSig = this.hmac(payloadB64);
    const sigBuf = Buffer.from(sigB64, 'base64url');
    const expBuf = Buffer.from(expectedSig, 'base64url');

    if (sigBuf.length !== expBuf.length) return null;
    if (!timingSafeEqual(sigBuf, expBuf)) return null;

    try {
      const json = Buffer.from(payloadB64, 'base64url').toString('utf8');
      const payload = JSON.parse(json) as TokenPayload;
      if (typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
      return payload;
    } catch {
      return null;
    }
  }

  private signToken(payload: TokenPayload): string {
    const json = JSON.stringify(payload);
    const payloadB64 = Buffer.from(json, 'utf8').toString('base64url');
    const sig = this.hmac(payloadB64);
    return `${payloadB64}.${sig}`;
  }

  private hmac(data: string): string {
    const secret = this.configService.tokenSecret || AuthService.SECRET_FALLBACK;
    return createHmac('sha256', secret).update(data).digest('base64url');
  }

  private safeEqual(a: string, b: string): boolean {
    const ab = Buffer.from(a, 'utf8');
    const bb = Buffer.from(b, 'utf8');
    if (ab.length !== bb.length) return false;
    return timingSafeEqual(ab, bb);
  }
}
