import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module.js';
import type { Env } from './config/env.js';
import { configurarSwagger } from './config/swagger.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // /health fica fora do prefixo para healthchecks de infraestrutura.
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
    exposedHeaders: ['Content-Disposition'],
  });

  if (config.get('NODE_ENV', { infer: true }) !== 'production') {
    configurarSwagger(app);
  }

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
