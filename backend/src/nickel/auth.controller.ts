import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';

class LoginDto {
  @IsString()
  @MinLength(1, { message: '用户名不能为空' })
  username!: string;

  @IsString()
  @MinLength(1, { message: '密码不能为空' })
  password!: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * 登录端点 — 不挂 ApiKeyGuard（用户用账号密码换取 token，无需设备级密钥）
   * 显式挂 RateLimitGuard 防止凭据暴力枚举
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(RateLimitGuard)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  /**
   * 验证当前 token 是否有效，返回当前用户信息
   * 显式挂 JwtAuthGuard 复用统一的 token 校验逻辑（含错误格式归一化）
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: Request) {
    // JwtAuthGuard 已校验通过，user 已被挂在 request.user
    const user = (req as any).user as { id: string; username: string };
    return { id: user.id, username: user.username };
  }
}
