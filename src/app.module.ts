import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { EventosModule } from './modules/eventos/eventos.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { DiasEventoModule } from './modules/dias-evento/dias-evento.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),
    PrismaModule,
    HealthModule,
    EventosModule,
    DiasEventoModule,
  ],
})
export class AppModule {}
