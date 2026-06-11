import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NickelConfigService } from './config/config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
    logger: ['log', 'warn', 'error'],
  });

  const configService = app.get(NickelConfigService);
  const port = configService.port;

  await app.listen(port);
  console.log(`[MarkApp Backend] 运行在 http://localhost:${port}`);
  console.log(`[MarkApp Backend] 环境: ${configService.nodeEnv}`);
  console.log(`[MarkApp Backend] RapidOCR: ${configService.rapidOcrUrl}`);
}

bootstrap();
