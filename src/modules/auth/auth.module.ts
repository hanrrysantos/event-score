import { DynamicModule, Module, Provider } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { JwtModuleOptions } from '@nestjs/jwt';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { AuthUserRepository } from './auth-user.repository.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { LoginService } from './login.service.js';
import { PasswordHashService } from './password-hash.service.js';

@Module({})
export class AuthModule {
  static register(repository: Provider<AuthUserRepository>): DynamicModule {
    return {
      module: AuthModule,
      imports: [
        JwtModule.registerAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService): JwtModuleOptions => {
            const secret = config.get<string>('JWT_SECRET');
            if (!secret || secret.length < 32) {
              throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres');
            }
            return {
              secret,
              signOptions: { algorithm: 'HS256', expiresIn: '1h' },
              verifyOptions: { algorithms: ['HS256'] },
            };
          },
        }),
      ],
      controllers: [AuthController],
      providers: [
        repository,
        PasswordHashService,
        AuthService,
        LoginService,
        JwtAuthGuard,
        { provide: APP_GUARD, useExisting: JwtAuthGuard },
      ],
      exports: [
        AuthService,
        PasswordHashService,
        JwtAuthGuard,
        JwtModule,
        AuthUserRepository,
      ],
    };
  }
}
