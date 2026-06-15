import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NickelConfigService } from './config/config.service';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: true,
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

  const configService = app.get(NickelConfigService);
  const port = configService.port;

  await app.listen(port);
  console.log(`[MarkApp Backend] 运行在 http://localhost:${port}`);
  console.log(`[MarkApp Backend] 环境: ${configService.nodeEnv}`);
  console.log(`[MarkApp Backend] RapidOCR: ${configService.rapidOcrUrl}`);
}

bootstrap();
