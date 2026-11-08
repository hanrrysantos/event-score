import { readFileSync } from 'node:fs';
import {
  criarOuAtualizarAdmin,
  lerAdminEnv,
  PERFIL_ADMIN,
  SENHA_PADRAO_DESENVOLVIMENTO,
} from './admin.js';

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

describe('senha de exemplo do .env.example', () => {
  const envComSenhaPadrao = {
    ...envValido,
    ADMIN_SENHA: SENHA_PADRAO_DESENVOLVIMENTO,
  };

  it('é recusada por padrão, que é o caso do db:admin usado em produção', () => {
    expect(() => lerAdminEnv(envComSenhaPadrao)).toThrow(
      /valor de exemplo do \.env\.example/,
    );
  });

  it('é aceita só quando o seed de desenvolvimento permite', () => {
    expect(
      lerAdminEnv(envComSenhaPadrao, { permitirSenhaPadrao: true }).ADMIN_SENHA,
    ).toBe(SENHA_PADRAO_DESENVOLVIMENTO);
  });

  it('é a mesma do .env.example, para a recusa não ficar desatualizada', () => {
    const envExample = readFileSync('.env.example', 'utf8');

    expect(envExample).toMatch(
      new RegExp(`^ADMIN_SENHA=${SENHA_PADRAO_DESENVOLVIMENTO}$`, 'm'),
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

    const resultado = await criarOuAtualizarAdmin(prisma as never, admin, {
      hasher,
    });

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

    const resultado = await criarOuAtualizarAdmin(prisma as never, admin, {
      hasher,
    });

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

  it('mantém o administrador existente sem regravar a senha quando atualizarExistente é false', async () => {
    const prisma = prismaFalso({ id: 7 });
    hasher.hash.mockClear();

    const resultado = await criarOuAtualizarAdmin(prisma as never, admin, {
      atualizarExistente: false,
      hasher,
    });

    expect(resultado).toBe('mantido');
    expect(hasher.hash).not.toHaveBeenCalled();
    expect(prisma.usuario.update).not.toHaveBeenCalled();
    expect(prisma.usuario.create).not.toHaveBeenCalled();
  });

  it('cria o administrador mesmo com atualizarExistente false quando ele não existe', async () => {
    const prisma = prismaFalso(null);

    const resultado = await criarOuAtualizarAdmin(prisma as never, admin, {
      atualizarExistente: false,
      hasher,
    });

    expect(resultado).toBe('criado');
    expect(prisma.usuario.create).toHaveBeenCalledTimes(1);
  });
});
