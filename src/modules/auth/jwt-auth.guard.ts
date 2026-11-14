import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthUserRepository } from './auth-user.repository.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

export interface JwtAuthenticatedRequest extends Request {
  user?: { id: number };
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: AuthUserRepository,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<JwtAuthenticatedRequest>();
    const authorization = request.headers.authorization;
    const match = /^Bearer ([^\s]+)$/i.exec(authorization ?? '');
    if (!match) {
      throw new UnauthorizedException('Token ausente ou inválido');
    }

    let payload: unknown;
    try {
      payload = await this.jwt.verifyAsync(match[1]);
    } catch {
      throw new UnauthorizedException('Token ausente ou inválido');
    }
    if (
      !payload ||
      typeof payload !== 'object' ||
      !('sub' in payload) ||
      typeof payload.sub !== 'number' ||
      !Number.isSafeInteger(payload.sub) ||
      payload.sub < 1
    ) {
      throw new UnauthorizedException('Token ausente ou inválido');
    }
    const user = await this.users.findById(payload.sub);
    if (!user || !user.ativo || user.perfil !== 'ADMIN') {
      throw new UnauthorizedException('Token ausente ou inválido');
    }
    request.user = { id: payload.sub };
    return true;
  }
}
