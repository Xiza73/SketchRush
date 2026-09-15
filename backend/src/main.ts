import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { parseAllowedOrigins, parsePort } from '@shared/config/env';
import { CorsIoAdapter } from '@shared/socket/cors-io.adapter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: ['log', 'warn', 'error'] });
  const config = app.get(ConfigService);
  const origins = parseAllowedOrigins(config.get<string>('FRONTEND_URL'));
  const port = parsePort(config.get<string>('PORT'));

  app.enableCors({ origin: origins ?? true, credentials: true });
  app.useWebSocketAdapter(new CorsIoAdapter(app, origins));
  app.enableShutdownHooks();

  await app.listen(port, '0.0.0.0');
  Logger.log(
    `SketchRush server listening on 0.0.0.0:${port} (CORS: ${origins ? origins.join(', ') : 'any origin'})`,
    'Bootstrap',
  );
}

void bootstrap();
