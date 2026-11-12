import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './auth-user.repository.js';
import { PasswordHashService } from './password-hash.service.js';

describe('AuthService', () => {
  const admin: AuthUser = {
    id: 1,
    nome: 'Admin',
    email: 'admin@example.com',
    senhaHash: 'hash-do-teste',
    perfil: 'ADMIN',
    ativo: true,
  };
  const credentials = {
    email: '  ADMIN@example.com  ',
    senha: 'senha-correta',
  };

  function setup(user: AuthUser | null = admin) {
    const repository = {
      findByEmail: vi.fn(async (_email: string) => user),
      findById: vi.fn(),
    };
    const passwordHash = new PasswordHashService();
    const verify = vi.spyOn(passwordHash, 'verify').mockResolvedValue(true);
    const service = new AuthService(repository, passwordHash);

    return { service, repository, verify };
  }

  it('valida o administrador e retorna apenas dados públicos', async () => {
    const { service, repository, verify } = setup();

    const result = await service.validateCredentials(credentials);

    expect(repository.findByEmail).toHaveBeenCalledWith('admin@example.com');
    expect(verify).toHaveBeenCalledWith(admin.senhaHash, credentials.senha);
    expect(result).toEqual({
      id: admin.id,
      nome: admin.nome,
      email: admin.email,
    });
    expect(result).not.toHaveProperty('senhaHash');
    expect(result).not.toHaveProperty('senha');
  });

  it('rejeita senha incorreta com 401', async () => {
    const { service, verify } = setup();
    verify.mockResolvedValue(false);

    await expect(
      service.validateCredentials(credentials),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejeita usuário inexistente com 401', async () => {
    const { service, verify } = setup(null);

    await expect(
      service.validateCredentials(credentials),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejeita conta inativa com 401', async () => {
    const { service, verify } = setup({ ...admin, ativo: false });

    await expect(
      service.validateCredentials(credentials),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejeita perfil diferente de ADMIN com 401', async () => {
    const { service, verify } = setup({ ...admin, perfil: 'OPERADOR' });

    await expect(
      service.validateCredentials(credentials),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });

  it('rejeita dados de login inválidos com 400 sem consultar usuários', async () => {
    const { service, repository } = setup();

    await expect(
      service.validateCredentials({ email: ' ', senha: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.findByEmail).not.toHaveBeenCalled();
  });

  it('retorna somente os dados públicos do administrador atual', async () => {
    const { service, repository } = setup();
    repository.findById.mockResolvedValue(admin);

    const result = await service.getCurrentUser(admin.id);

    expect(repository.findById).toHaveBeenCalledWith(admin.id);
    expect(result).toEqual({
      id: admin.id,
      nome: admin.nome,
      email: admin.email,
    });
    expect(result).not.toHaveProperty('senhaHash');
  });

  it.each([null, { ...admin, ativo: false }, { ...admin, perfil: 'OPERADOR' }])(
    'rejeita conta indisponível ao consultar o administrador atual: %o',
    async (user) => {
      const { service, repository } = setup();
      repository.findById.mockResolvedValue(user);
      await expect(service.getCurrentUser(admin.id)).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    },
  );
});
