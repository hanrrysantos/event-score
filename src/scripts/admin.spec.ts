import { criarOuAtualizarAdmin, lerAdminEnv, PERFIL_ADMIN } from './admin.js';

const envValido = {
  ADMIN_NOME: ' Administrador ',
  ADMIN_EMAIL: 'Admin@EventScore.local',
  ADMIN_SENHA: 'senha-forte-123',
};

describe('lerAdminEnv', () => {
  it('normaliza o e-mail para minúsculas e remove espaços do nome', () => {
    expect(lerAdminEnv(envValido)).toEqual({
      ADMIN_NOME: 'Administrador',
      ADMIN_EMAIL: 'admin@eventscore.local',
      ADMIN_SENHA: 'senha-forte-123',
    });
  });

  it.each([
    { ADMIN_NOME: undefined },
    { ADMIN_EMAIL: 'nao-e-email' },
    { ADMIN_SENHA: 'curta' },
  ])('recusa variável ausente ou inválida: %o', (alteracao) => {
    expect(() => lerAdminEnv({ ...envValido, ...alteracao })).toThrow(
      /Variáveis do administrador inválidas/,
    );
  });
});

describe('criarOuAtualizarAdmin', () => {
  const admin = lerAdminEnv(envValido);
  const hasher = { hash: vi.fn().mockResolvedValue('hash-argon2') };

  function prismaFalso(existente: { id: number } | null) {
    return {
      usuario: {
        findFirst: vi.fn().mockResolvedValue(existente),
        create: vi.fn(),
        update: vi.fn(),
      },
    };
  }

  it('cria o administrador com perfil ADMIN e a senha com hash', async () => {
    const prisma = prismaFalso(null);

    const resultado = await criarOuAtualizarAdmin(
      prisma as never,
      admin,
      hasher,
    );

    expect(resultado).toBe('criado');
    expect(hasher.hash).toHaveBeenCalledWith('senha-forte-123');
    expect(prisma.usuario.findFirst).toHaveBeenCalledWith({
      where: {
        email: { equals: 'admin@eventscore.local', mode: 'insensitive' },
      },
      select: { id: true },
    });
    expect(prisma.usuario.create).toHaveBeenCalledWith({
      data: {
        nome: 'Administrador',
        email: 'admin@eventscore.local',
        senhaHash: 'hash-argon2',
        perfil: PERFIL_ADMIN,
        ativo: true,
      },
    });
    expect(prisma.usuario.update).not.toHaveBeenCalled();
  });

  it('atualiza nome, senha, perfil e ativo quando o e-mail já existe', async () => {
    const prisma = prismaFalso({ id: 7 });

    const resultado = await criarOuAtualizarAdmin(
      prisma as never,
      admin,
      hasher,
    );

    expect(resultado).toBe('atualizado');
    expect(prisma.usuario.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        nome: 'Administrador',
        senhaHash: 'hash-argon2',
        perfil: PERFIL_ADMIN,
        ativo: true,
      },
    });
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });
});
