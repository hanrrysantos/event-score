import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { validateEnv } from '../config/env.js';

// Client do Prisma para scripts executados fora do Nest (seed e criação do
// admin). Valida as mesmas variáveis da aplicação antes de conectar.
export function criarPrismaScript(): PrismaClient {
  const env = validateEnv(process.env);

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
}

// Executa o script, fecha a conexão e devolve código de saída 1 em caso de erro.
export async function executarScript(
  nome: string,
  tarefa: (prisma: PrismaClient) => Promise<void>,
): Promise<void> {
  let prisma: PrismaClient | undefined;

  try {
    prisma = criarPrismaScript();
    await tarefa(prisma);
  } catch (erro) {
    console.error(
      `[${nome}] falhou:`,
      erro instanceof Error ? erro.message : erro,
    );
    process.exitCode = 1;
  } finally {
    await prisma?.$disconnect();
  }
}
