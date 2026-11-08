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

export function lerAdminEnv(env: Record<string, unknown>): AdminEnv {
  const result = adminEnvSchema.safeParse(env);

  if (!result.success) {
    throw new Error(
      `Variáveis do administrador inválidas:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}

export type ResultadoAdmin = 'criado' | 'atualizado';

// Cria o administrador ou, se o e-mail já existir (sem diferenciar maiúsculas),
// atualiza nome e senha e garante perfil ADMIN ativo. Rodar de novo serve para
// trocar a senha no servidor.
export async function criarOuAtualizarAdmin(
  prisma: Pick<PrismaClient, 'usuario'>,
  admin: AdminEnv,
  hasher: Pick<PasswordHashService, 'hash'> = new PasswordHashService(),
): Promise<ResultadoAdmin> {
  const senhaHash = await hasher.hash(admin.ADMIN_SENHA);
  const dados = {
    nome: admin.ADMIN_NOME,
    senhaHash,
    perfil: PERFIL_ADMIN,
    ativo: true,
  };

  const existente = await prisma.usuario.findFirst({
    where: { email: { equals: admin.ADMIN_EMAIL, mode: 'insensitive' } },
    select: { id: true },
  });

  if (existente) {
    await prisma.usuario.update({ where: { id: existente.id }, data: dados });
    return 'atualizado';
  }

  await prisma.usuario.create({ data: { ...dados, email: admin.ADMIN_EMAIL } });
  return 'criado';
}
