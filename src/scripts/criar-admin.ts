// Cria o administrador a partir de ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA.
// A atualização de uma conta existente exige ADMIN_ATUALIZAR_EXISTENTE=true.
// Recusa a senha pública usada em versões anteriores do .env.example.
// Uso: npm run build && npm run db:admin
import 'reflect-metadata';
import { criarOuAtualizarAdmin, lerAdminEnv } from './admin.js';
import { executarScript } from './prisma-script.js';

await executarScript('criar-admin', async (prisma) => {
  const admin = lerAdminEnv(process.env);
  const atualizarExistente = process.env.ADMIN_ATUALIZAR_EXISTENTE === 'true';
  const resultado = await criarOuAtualizarAdmin(prisma, admin, {
    atualizarExistente,
  });

  console.log(`[criar-admin] administrador ${admin.ADMIN_EMAIL} ${resultado}.`);
});
