import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth.module.js';
import { AuthService } from './auth.service.js';
import { AuthUserRepository } from './auth-user.repository.js';

describe('AuthModule', () => {
  it('recebe o provedor de usuários e disponibiliza AuthService', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
            }),
          ],
        }),
        AuthModule.register({
          provide: AuthUserRepository,
          useValue: { findByEmail: vi.fn(), findById: vi.fn() },
        }),
      ],
    }).compile();

    expect(module.get(AuthService)).toBeInstanceOf(AuthService);
    await module.close();
  });
});
