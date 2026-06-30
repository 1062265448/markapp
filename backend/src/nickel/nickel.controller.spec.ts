import 'reflect-metadata';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { NickelController } from './nickel.controller';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * 控制器守卫挂载的回归测试 — 防止有人误把 @UseGuards 提到控制器级
 * （v2.3.4 就发生过：控制器级 JwtAuthGuard 让 /health 也强制登录，监控探针全军覆没）
 */
describe('NickelController — 守卫挂载位置', () => {
  const reflector = new Reflector();
  // 收集控制器自身的守卫（应该是空数组 — 不在类级别挂载）
  const classGuards = reflector.get(GUARDS_METADATA, NickelController) ?? [];

  // 收集所有方法（包括 health）并汇报它们各自挂载的守卫
  const methodGuardsOf = (methodName: string) => {
    const fn = (NickelController.prototype as any)[methodName];
    return reflector.get(GUARDS_METADATA, fn) ?? [];
  };

  it('控制器级不应挂任何守卫（防止 /health 误伤）', () => {
    expect(classGuards).toEqual([]);
  });

  describe.each([
    ['recognize', true],
    ['recognizeSpraycode', true],
    ['compare', true],
    ['getHistory', true],
    ['getRecordDetail', true],
    ['getImage', true],
    ['deleteRecord', true],
  ])('业务方法 %s', (methodName, _expectJwt) => {
    it('必须挂 JwtAuthGuard + ApiKeyGuard + RateLimitGuard', () => {
      const guards = methodGuardsOf(methodName);
      expect(guards).toContain(ApiKeyGuard);
      expect(guards).toContain(RateLimitGuard);
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('健康检查 /health', () => {
    it('必须不挂 JwtAuthGuard（回归 v2.3.4 误伤）', () => {
      const guards = methodGuardsOf('health');
      expect(guards).not.toContain(JwtAuthGuard);
    });

    it('仍应挂 ApiKeyGuard + RateLimitGuard 防止滥用', () => {
      const guards = methodGuardsOf('health');
      expect(guards).toContain(ApiKeyGuard);
      expect(guards).toContain(RateLimitGuard);
    });
  });
});
