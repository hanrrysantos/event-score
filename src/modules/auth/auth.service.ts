import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthUserRepository } from './auth-user.repository.js';
import { loginSchema } from './dto/login.dto.js';
import type { LoginDto } from './dto/login.dto.js';
import { PasswordHashService } from './password-hash.service.js';

export interface AuthenticatedUser {
  id: number;
  nome: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(AuthUserRepository)
    private readonly users: AuthUserRepository,
    private readonly passwordHash: PasswordHashService,
  ) {}

  async validateCredentials(credentials: LoginDto): Promise<AuthenticatedUser> {
    const result = loginSchema.safeParse(credentials);
    if (!result.success) {
      throw new BadRequestException('Dados de login inválidos');
    }

    const { email, senha } = result.data;
    const user = await this.users.findByEmail(email.toLowerCase());

    if (!user || !user.ativo || user.perfil !== 'ADMIN') {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    const validPassword = await this.passwordHash.verify(user.senhaHash, senha);
    if (!validPassword) {
      throw new UnauthorizedException('E-mail ou senha inválidos');
    }

    return { id: user.id, nome: user.nome, email: user.email };
  }
}
