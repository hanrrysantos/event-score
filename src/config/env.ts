import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Os scripts de banco não precisam do segredo; a API exige-o ao iniciar.
  JWT_SECRET: z.string().min(32).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    throw new Error(
      `Variáveis de ambiente inválidas:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}

export function validateAppEnv(config: Record<string, unknown>): Env {
  const env = validateEnv(config);
  if (!env.JWT_SECRET) {
    throw new Error('JWT_SECRET deve ter pelo menos 32 caracteres');
  }
  return env;
}
