import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { NickelConfigService } from '../config/config.service';

describe('AuthService', () => {
  let service: AuthService;
  let config: { adminUsername: string; adminPassword: string; tokenSecret: string };

  const buildModule = async (overrides: Partial<typeof config> = {}) => {
    config = {
      adminUsername: 'admin',
      adminPassword: 'correct-pw',
      tokenSecret: 'test-secret-key-32-bytes-or-more-please',
      ...overrides,
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: NickelConfigService,
          useValue: config,
        },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  };

  beforeEach(async () => {
    await buildModule();
  });

  describe('login', () => {
    it('正确账号密码应签发 token', async () => {
      const result = await service.login('admin', 'correct-pw');
      expect(result.access_token).toContain('.');
      expect(result.token_type).toBe('Bearer');
      expect(result.user).toEqual({ id: '1', username: 'admin' });
      expect(result.expires_in).toBeGreaterThan(0);
    });

    it('错误密码应抛 401', async () => {
      await expect(service.login('admin', 'wrong')).rejects.toThrow(UnauthorizedException);
    });

    it('错误用户名应抛 401', async () => {
      await expect(service.login('hacker', 'correct-pw')).rejects.toThrow(UnauthorizedException);
    });

    it('未配置 ADMIN_USERNAME 时回退到 admin / admin123', async () => {
      await buildModule({ adminUsername: '', adminPassword: '' });
      const ok = await service.login('admin', 'admin123');
      expect(ok.access_token).toBeTruthy();
      await expect(service.login('admin', 'wrong')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('verify', () => {
    it('合法 token 应返回 payload', async () => {
      const { access_token } = await service.login('admin', 'correct-pw');
      const payload = service.verify(access_token);
      expect(payload).not.toBeNull();
      expect(payload!.username).toBe('admin');
      expect(payload!.sub).toBe('1');
      expect(payload!.exp).toBeGreaterThan(Date.now());
    });

    it('篡改签名应返回 null', async () => {
      const { access_token } = await service.login('admin', 'correct-pw');
      const [p] = access_token.split('.');
      const tampered = `${p}.AAAAAAAA`;
      expect(service.verify(tampered)).toBeNull();
    });

    it('篡改 payload 应返回 null', async () => {
      const fakePayload = Buffer.from(
        JSON.stringify({ sub: '1', username: 'admin', exp: Date.now() + 60000 }),
      ).toString('base64url');
      const fakeSig = 'A'.repeat(43); // 任意长度
      const fakeToken = `${fakePayload}.${fakeSig}`;
      expect(service.verify(fakeToken)).toBeNull();
    });

    it('过期 token 应返回 null', async () => {
      // 直接构造一个过期 token
      const json = JSON.stringify({ sub: '1', username: 'admin', exp: Date.now() - 1000 });
      const payloadB64 = Buffer.from(json, 'utf8').toString('base64url');
      // 用相同 secret 签名
      const crypto = require('crypto');
      const sig = crypto.createHmac('sha256', config.tokenSecret).update(payloadB64).digest('base64url');
      const expiredToken = `${payloadB64}.${sig}`;
      expect(service.verify(expiredToken)).toBeNull();
    });

    it('格式错误 token 应返回 null', () => {
      expect(service.verify('not-a-token')).toBeNull();
      expect(service.verify('only.one.dot.too.many.parts')).toBeNull();
      expect(service.verify('')).toBeNull();
      expect(service.verify(undefined as any)).toBeNull();
    });
  });

  describe('secret 隔离', () => {
    it('不同 secret 签名的 token 应验证失败', async () => {
      const { access_token } = await service.login('admin', 'correct-pw');
      // 用不同 secret 创建的 service 实例
      await buildModule({ tokenSecret: 'different-secret' });
      expect(service.verify(access_token)).toBeNull();
    });
  });
});
