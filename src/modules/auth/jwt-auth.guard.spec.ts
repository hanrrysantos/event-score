import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import type { AuthUser } from './auth-user.repository.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { JwtAuthenticatedRequest } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({
    secret: 'test-only-secret-with-at-least-32-characters',
    signOptions: { algorithm: 'HS256', expiresIn: '1h' },
    verifyOptions: { algorithms: ['HS256'] },
  });
  const admin: AuthUser = {
    id: 7,
    nome: 'Admin',
    email: 'admin@example.com',
    senhaHash: 'hash-simulado',
    perfil: 'ADMIN',
    ativo: true,
  };
  const users = {
    findByEmail: vi.fn(),
    findById: vi.fn(async (): Promise<AuthUser | null> => admin),
  };
  const guard = new JwtAuthGuard(jwt, users, new Reflector());

  beforeEach(() => {
    users.findById.mockReset();
    users.findById.mockResolvedValue(admin);
  });

  function context(authorization?: string) {
    const request = { headers: { authorization } } as JwtAuthenticatedRequest;
    const executionContext = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => context,
      getClass: () => JwtAuthGuard,
    } as unknown as ExecutionContext;
    return { request, executionContext };
  }

  it('aceita token assinado e expõe somente o ID autenticado', async () => {
    const token = await jwt.signAsync({ sub: 7 });
    const { request, executionContext } = context(`Bearer ${token}`);

    await expect(guard.canActivate(executionContext)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 7 });
    expect(users.findById).toHaveBeenCalledWith(7);
  });

  it.each([undefined, '', 'Basic abc', 'Bearer', 'Bearer abc def'])(
    'rejeita cabeçalho ausente ou malformado: %s',
    async (authorization) => {
      await expect(
        guard.canActivate(context(authorization).executionContext),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it('rejeita assinatura inválida', async () => {
    const foreignJwt = new JwtService({
      secret: 'another-test-only-secret-with-32-characters',
    });
    const token = await foreignJwt.signAsync({ sub: 7 });
    await expect(
      guard.canActivate(context(`Bearer ${token}`).executionContext),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita token expirado', async () => {
    const token = await jwt.signAsync({ sub: 7 }, { expiresIn: -1 });
    await expect(
      guard.canActivate(context(`Bearer ${token}`).executionContext),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita token sem identificador válido', async () => {
    const token = await jwt.signAsync({ sub: '7' });
    await expect(
      guard.canActivate(context(`Bearer ${token}`).executionContext),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it.each([
    [null, 'conta removida'],
    [{ ...admin, ativo: false }, 'conta inativa'],
    [{ ...admin, perfil: 'OPERADOR' }, 'perfil não administrativo'],
  ])('rejeita %s (%s)', async (account, _description) => {
    users.findById.mockResolvedValueOnce(account);
    const token = await jwt.signAsync({ sub: 7 });
    await expect(
      guard.canActivate(context(`Bearer ${token}`).executionContext),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
