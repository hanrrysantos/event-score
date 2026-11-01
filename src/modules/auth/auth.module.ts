import { DynamicModule, Module, Provider } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthUserRepository } from './auth-user.repository.js';
import { PasswordHashService } from './password-hash.service.js';

@Module({})
export class AuthModule {
  // A T15 fornecerá o repositório real quando o modelo USUARIO estiver integrado.
  static register(repository: Provider<AuthUserRepository>): DynamicModule {
    return {
      module: AuthModule,
      providers: [repository, PasswordHashService, AuthService],
      exports: [AuthService, PasswordHashService],
    };
  }
}
