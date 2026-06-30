import { ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RateLimitGuard } from './rate-limit.guard';

describe('RateLimitGuard', () => {
  const buildContext = (ip: string, headers: Record<string, string | undefined> = {}): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ ip, headers, connection: { remoteAddress: ip } }),
      }),
    } as unknown as ExecutionContext;
  };

  const buildGuard = (config: { window: number; max: number; trustProxy: boolean }) => {
    const configService = {
      get rateLimitWindow() { return config.window; },
      get rateLimitMax() { return config.max; },
      get trustProxy() { return config.trustProxy; },
    } as any;
    return new RateLimitGuard(configService);
  };

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('基本限流', () => {
    it('未超限应放行', () => {
      const guard = buildGuard({ window: 60000, max: 3, trustProxy: false });
      const ctx = buildContext('1.2.3.4');
      expect(guard.canActivate(ctx)).toBe(true);
      expect(guard.canActivate(ctx)).toBe(true);
      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('超限应抛 429', () => {
      const guard = buildGuard({ window: 60000, max: 2, trustProxy: false });
      const ctx = buildContext('1.2.3.4');
      guard.canActivate(ctx);
      guard.canActivate(ctx);
      expect(() => guard.canActivate(ctx)).toThrow(HttpException);
      try {
        guard.canActivate(ctx);
      } catch (e: any) {
        expect(e.getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
      }
    });

    it('不同 IP 独立计数', () => {
      const guard = buildGuard({ window: 60000, max: 1, trustProxy: false });
      expect(guard.canActivate(buildContext('1.1.1.1'))).toBe(true);
      expect(guard.canActivate(buildContext('2.2.2.2'))).toBe(true);
      expect(() => guard.canActivate(buildContext('1.1.1.1'))).toThrow(HttpException);
    });

    it('窗口过期后应重置', () => {
      jest.useFakeTimers();
      const guard = buildGuard({ window: 1000, max: 1, trustProxy: false });
      const ctx = buildContext('1.2.3.4');
      guard.canActivate(ctx);
      expect(() => guard.canActivate(ctx)).toThrow(HttpException);

      // 推进时间超过窗口
      jest.advanceTimersByTime(1500);
      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('Trust Proxy', () => {
    it('trustProxy=false 时忽略 X-Forwarded-For（防伪造）', () => {
      const guard = buildGuard({ window: 60000, max: 1, trustProxy: false });
      const ctx = buildContext('1.1.1.1', { 'x-forwarded-for': '9.9.9.9' });
      guard.canActivate(ctx);
      // 同 IP 但伪造 X-Forwarded-For → 仍按 1.1.1.1 限流
      expect(() => guard.canActivate(ctx)).toThrow(HttpException);
    });

    it('trustProxy=true 时取 X-Forwarded-For 首段', () => {
      const guard = buildGuard({ window: 60000, max: 1, trustProxy: true });
      const ctx1 = buildContext('10.0.0.1', { 'x-forwarded-for': '1.1.1.1, 10.0.0.1' });
      const ctx2 = buildContext('10.0.0.1', { 'x-forwarded-for': '2.2.2.2, 10.0.0.1' });
      guard.canActivate(ctx1); // 1.1.1.1 计数
      // 第二个 X-Forwarded-For 第一个 IP 不同 → 视为不同客户端
      expect(guard.canActivate(ctx2)).toBe(true);
    });

    it('trustProxy=true 但无 X-Forwarded-For 时回退到 socket IP', () => {
      const guard = buildGuard({ window: 60000, max: 1, trustProxy: true });
      const ctx = buildContext('1.2.3.4');
      guard.canActivate(ctx);
      expect(() => guard.canActivate(ctx)).toThrow(HttpException);
    });
  });
});
