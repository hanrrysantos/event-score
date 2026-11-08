// Cria ou atualiza o administrador a partir de ADMIN_NOME, ADMIN_EMAIL e
// ADMIN_SENHA. Não grava nenhum dado fictício: é o script para o servidor.
// Uso: npm run build && npm run db:admin
import 'reflect-metadata';
import { criarOuAtualizarAdmin, lerAdminEnv } from './admin.js';
import { executarScript } from './prisma-script.js';

await executarScript('criar-admin', async (prisma) => {
  const admin = lerAdminEnv(process.env);
  const resultado = await criarOuAtualizarAdmin(prisma, admin);

  console.log(`[criar-admin] administrador ${admin.ADMIN_EMAIL} ${resultado}.`);
});
