import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthUserRepository } from './auth-user.repository.js';
import type { AuthUser, AuthUserIdentity } from './auth-user.repository.js';

@Injectable()
export class PrismaAuthUserRepository extends AuthUserRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findByEmail(email: string): Promise<AuthUser | null> {
    return this.prisma.usuario.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: {
        id: true,
        nome: true,
        email: true,
        senhaHash: true,
        perfil: true,
        ativo: true,
      },
    });
  }

  findById(id: number): Promise<AuthUserIdentity | null> {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
      },
    });
  }
}
