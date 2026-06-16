import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NickelConfigService } from './config/config.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',').map(s => s.trim()) || [],
      methods: ['GET', 'POST', 'DELETE'],
      allowedHeaders: ['Content-Type', 'x-api-key', 'Authorization'],
      credentials: true,
    },
    logger: ['log', 'warn', 'error'],
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.enableShutdownHooks();

  // 安全头
  app.use((req: any, res: any, next: any) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.removeHeader('X-Powered-By');
    next();
  });

  const configService = app.get(NickelConfigService);
  const port = configService.port;

  await app.listen(port);
  console.log(`[MarkApp Backend] 运行在 http://localhost:${port}`);
  console.log(`[MarkApp Backend] 环境: ${configService.nodeEnv}`);
  console.log(`[MarkApp Backend] API Key 认证: ${configService.apiKeyEnabled ? '已启用' : '未启用'}`);
  console.log(`[MarkApp Backend] RapidOCR: ${configService.rapidOcrUrl}`);
}

bootstrap().catch((err) => {
  console.error('[MarkApp Backend] 启动失败:', err);
  process.exit(1);
});
