import { readFileSync } from 'node:fs';
import {
  criarOuAtualizarAdmin,
  lerAdminEnv,
  PERFIL_ADMIN,
  SENHA_PADRAO_INSEGURA,
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

describe('senha inicial segura', () => {
  const envComSenhaPadrao = {
    ...envValido,
    ADMIN_SENHA: SENHA_PADRAO_INSEGURA,
  };

  it('recusa a antiga senha pública no seed e no db:admin', () => {
    expect(() => lerAdminEnv(envComSenhaPadrao)).toThrow(
      /senha pública de versões anteriores/,
    );
  });

  it('não publica uma senha funcional no .env.example', () => {
    const envExample = readFileSync('.env.example', 'utf8');
    expect(envExample).not.toMatch(/^ADMIN_SENHA=/m);
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
      atualizarExistente: true,
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

  it('mantém o administrador existente sem regravar a senha por padrão', async () => {
    const prisma = prismaFalso({ id: 7 });
    hasher.hash.mockClear();

    const resultado = await criarOuAtualizarAdmin(prisma as never, admin, {
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
