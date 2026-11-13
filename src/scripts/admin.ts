import { z } from 'zod';
import type { PrismaClient } from '../generated/prisma/client.js';
import { PasswordHashService } from '../modules/auth/password-hash.service.js';

// O contrato com o front prevê um único perfil, o de administrador. A coluna
// usuario.perfil continua no banco (padrão OPERADOR), então o admin é gravado
// explicitamente como ADMIN.
export const PERFIL_ADMIN = 'ADMIN';

export const adminEnvSchema = z.object({
  ADMIN_NOME: z.string().trim().min(1).max(150),
  ADMIN_EMAIL: z
    .email()
    .max(150)
    .transform((email) => email.toLowerCase()),
  ADMIN_SENHA: z
    .string()
    .min(12, 'ADMIN_SENHA precisa ter ao menos 12 caracteres'),
});

export type AdminEnv = z.infer<typeof adminEnvSchema>;

// Recusa a senha que foi publicada em versões anteriores do .env.example.
export const SENHA_PADRAO_INSEGURA = 'troque-esta-senha';

export function lerAdminEnv(env: Record<string, unknown>): AdminEnv {
  const result = adminEnvSchema.safeParse(env);

  if (!result.success) {
    throw new Error(
      `Variáveis do administrador inválidas:\n${z.prettifyError(result.error)}`,
    );
  }

  if (result.data.ADMIN_SENHA === SENHA_PADRAO_INSEGURA) {
    throw new Error(
      'ADMIN_SENHA usa uma senha pública de versões anteriores. Defina uma senha própria antes de criar o administrador.',
    );
  }

  return result.data;
}

export type ResultadoAdmin = 'criado' | 'atualizado' | 'mantido';

export interface OpcoesAdmin {
  // Padrão false: reexecuções mantêm o usuário existente sem trocar a senha.
  // true: regrava nome, hash, perfil ADMIN e ativo; exige escolha explícita.
  atualizarExistente?: boolean;
  hasher?: Pick<PasswordHashService, 'hash'>;
}

// Cria o administrador ou trata o já existente (e-mail sem diferenciar
// maiúsculas) conforme `atualizarExistente`.
export async function criarOuAtualizarAdmin(
  prisma: Pick<PrismaClient, 'usuario'>,
  admin: AdminEnv,
  {
    atualizarExistente = false,
    hasher = new PasswordHashService(),
  }: OpcoesAdmin = {},
): Promise<ResultadoAdmin> {
  const existente = await prisma.usuario.findFirst({
    where: { email: { equals: admin.ADMIN_EMAIL, mode: 'insensitive' } },
    select: { id: true },
  });

  if (existente && !atualizarExistente) {
    return 'mantido';
  }

  const dados = {
    nome: admin.ADMIN_NOME,
    senhaHash: await hasher.hash(admin.ADMIN_SENHA),
    perfil: PERFIL_ADMIN,
    ativo: true,
  };

  if (existente) {
    await prisma.usuario.update({ where: { id: existente.id }, data: dados });
    return 'atualizado';
  }

  await prisma.usuario.create({ data: { ...dados, email: admin.ADMIN_EMAIL } });
  return 'criado';
}
