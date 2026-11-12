import type { PrismaService } from '../../prisma/prisma.service.js';
import { PrismaAuthUserRepository } from './prisma-auth-user.repository.js';

describe('PrismaAuthUserRepository', () => {
  const user = {
    id: 4,
    nome: 'Administradora',
    email: 'admin@example.com',
    senhaHash: 'hash-armazenado',
    perfil: 'ADMIN',
    ativo: true,
  };
  const findFirst = vi.fn().mockResolvedValue(user);
  const findUnique = vi.fn().mockResolvedValue({
    id: user.id,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    ativo: user.ativo,
  });
  const prisma = {
    usuario: { findFirst, findUnique },
  } as unknown as PrismaService;
  const repository = new PrismaAuthUserRepository(prisma);

  beforeEach(() => vi.clearAllMocks());

  it('consulta e-mail sem diferenciar maiúsculas e obtém o hash para login', async () => {
    await expect(repository.findByEmail('ADMIN@example.com')).resolves.toEqual(
      user,
    );
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: 'ADMIN@example.com', mode: 'insensitive' },
      },
      select: {
        id: true,
        nome: true,
        email: true,
        senhaHash: true,
        perfil: true,
        ativo: true,
      },
    });
  });

  it('consulta por ID sem carregar o hash para validar o token', async () => {
    const result = await repository.findById(4);
    expect(result).not.toHaveProperty('senhaHash');
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 4 },
      select: {
        id: true,
        nome: true,
        email: true,
        perfil: true,
        ativo: true,
      },
    });
  });
});
