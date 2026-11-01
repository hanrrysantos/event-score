import { Test } from '@nestjs/testing';
import { AuthModule } from './auth.module.js';
import { AuthService } from './auth.service.js';
import { AuthUserRepository } from './auth-user.repository.js';

describe('AuthModule', () => {
  it('recebe o provedor de usuários e disponibiliza AuthService', async () => {
    const module = await Test.createTestingModule({
      imports: [
        AuthModule.register({
          provide: AuthUserRepository,
          useValue: { findByEmail: vi.fn() },
        }),
      ],
    }).compile();

    expect(module.get(AuthService)).toBeInstanceOf(AuthService);
    await module.close();
  });
});
