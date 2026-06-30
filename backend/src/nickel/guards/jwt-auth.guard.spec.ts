import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AuthService } from '../auth.service';

describe('JwtAuthGuard', () => {
  const buildContext = (headers: Record<string, string | undefined>): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ headers }),
      }),
    } as unknown as ExecutionContext;
  };

  const buildAuthService = (verifyResult: any) => {
    return { verify: (token: string) => verifyResult } as unknown as AuthService;
  };

  it('合法 Bearer token 应放行并挂在 request.user', () => {
    const payload = { sub: '1', username: 'admin', exp: Date.now() + 60000 };
    const auth = buildAuthService(payload);
    const guard = new JwtAuthGuard(auth);
    // 用一个共享 request 对象，让 canActivate 内的 mutate 可见
    const sharedReq: any = { headers: { authorization: 'Bearer valid-token' } };
    const ctx: ExecutionContext = {
      switchToHttp: () => ({ getRequest: () => sharedReq }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(true);
    expect(sharedReq.user).toEqual({ id: '1', username: 'admin' });
  });

  it('缺少 Authorization 应抛 401', () => {
    const guard = new JwtAuthGuard(buildAuthService(null));
    expect(() => guard.canActivate(buildContext({}))).toThrow(UnauthorizedException);
  });

  it('Authorization 不以 Bearer 开头应抛 401', () => {
    const guard = new JwtAuthGuard(buildAuthService(null));
    expect(() => guard.canActivate(buildContext({ authorization: 'Basic xxx' }))).toThrow(UnauthorizedException);
  });

  it('verify 返回 null 应抛 401（token 无效/过期）', () => {
    const guard = new JwtAuthGuard(buildAuthService(null));
    expect(() => guard.canActivate(buildContext({ authorization: 'Bearer bad' }))).toThrow(UnauthorizedException);
  });

  it('应支持大小写不敏感的 Bearer 识别', () => {
    // RFC 7235 规定 scheme 不区分大小写
    const payload = { sub: '1', username: 'admin', exp: Date.now() + 60000 };
    const auth = buildAuthService(payload);
    const guard = new JwtAuthGuard(auth);
    const ctx = buildContext({ authorization: 'bearer valid-token' });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
