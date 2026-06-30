import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ApiKeyGuard } from './api-key.guard';

describe('ApiKeyGuard', () => {
  const buildContext = (headers: Record<string, string | undefined>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  };

  const buildGuard = (config: { apiKeyEnabled: boolean; apiKey: string }) => {
    const configService = {
      get apiKeyEnabled() { return config.apiKeyEnabled; },
      get apiKey() { return config.apiKey; },
    } as any;
    return new ApiKeyGuard(configService);
  };

  describe('API Key 关闭', () => {
    it('应直接放行', () => {
      const guard = buildGuard({ apiKeyEnabled: false, apiKey: '' });
      expect(guard.canActivate(buildContext({}))).toBe(true);
    });

    it('关闭时无 header 也放行', () => {
      const guard = buildGuard({ apiKeyEnabled: false, apiKey: 'secret' });
      expect(guard.canActivate(buildContext({}))).toBe(true);
    });
  });

  describe('API Key 启用', () => {
    it('正确 key 应放行', () => {
      const guard = buildGuard({ apiKeyEnabled: true, apiKey: 'secret-key' });
      expect(guard.canActivate(buildContext({ 'x-api-key': 'secret-key' }))).toBe(true);
    });

    it('缺少 header 应抛 401', () => {
      const guard = buildGuard({ apiKeyEnabled: true, apiKey: 'secret-key' });
      expect(() => guard.canActivate(buildContext({}))).toThrow(UnauthorizedException);
    });

    it('错误 key 应抛 401', () => {
      const guard = buildGuard({ apiKeyEnabled: true, apiKey: 'secret-key' });
      expect(() => guard.canActivate(buildContext({ 'x-api-key': 'wrong' }))).toThrow(UnauthorizedException);
    });

    it('服务端未配置 key 应抛 401', () => {
      const guard = buildGuard({ apiKeyEnabled: true, apiKey: '' });
      expect(() => guard.canActivate(buildContext({ 'x-api-key': 'any' }))).toThrow(UnauthorizedException);
    });

    it('不同长度 key 应立即拒绝（防时序）', () => {
      const guard = buildGuard({ apiKeyEnabled: true, apiKey: 'secret-key-32-chars-long-xx' });
      // 不同长度但部分匹配也不应通过
      expect(() => guard.canActivate(buildContext({ 'x-api-key': 'secret' }))).toThrow(UnauthorizedException);
    });
  });
});
