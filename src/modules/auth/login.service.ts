import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service.js';
import type { AuthenticatedUser } from './auth.service.js';
import type { LoginDto } from './dto/login.dto.js';

export interface LoginResponse {
  token: string;
  expiraEm: string;
  usuario: AuthenticatedUser;
}

@Injectable()
export class LoginService {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {}

  async login(credentials: LoginDto): Promise<LoginResponse> {
    const usuario = await this.auth.validateCredentials(credentials);
    const token = await this.jwt.signAsync({ sub: usuario.id });
    const payload: unknown = this.jwt.decode(token);
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('exp' in payload) ||
      typeof payload.exp !== 'number'
    ) {
      throw new Error('JWT emitido sem data de expiração');
    }

    return {
      token,
      expiraEm: new Date(payload.exp * 1000).toISOString(),
      usuario,
    };
  }
}
