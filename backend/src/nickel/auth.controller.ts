import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UnauthorizedException } from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AuthService } from './auth.service';

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
   * 登录端点 — 不受 ApiKeyGuard 保护（用户用账号密码换取 token）
   * 仍然受 RateLimitGuard 保护（通过在 Module 中全局绑定）
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto.username, dto.password);
  }

  /**
   * 验证当前 token 是否有效，返回当前用户信息
   */
  @Get('me')
  async me(@Req() req: Request) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('未登录');
    }
    const token = auth.slice(7).trim();
    const payload = this.authService.verify(token);
    if (!payload) {
      throw new UnauthorizedException('token 无效或已过期');
    }
    return { id: payload.sub, username: payload.username };
  }
}
