// Seed de desenvolvimento: evento Arena Comp 2026 com dias, grupos e fator de
// presença, mais o administrador definido em ADMIN_* no .env (só se ainda não
// existir).
// Uso: npm run db:seed
import 'reflect-metadata';
import { criarOuAtualizarAdmin, lerAdminEnv } from './admin.js';
import { aplicarMassaDev } from './massa-dev.js';
import { executarScript } from './prisma-script.js';

await executarScript('seed-dev', async (prisma) => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'a massa fictícia não roda em produção. Use npm run db:admin para criar o administrador.',
    );
  }

  const admin = lerAdminEnv(process.env);
  const massa = await aplicarMassaDev(prisma);
  // Não regrava um admin que já existe: a senha pode ter sido trocada localmente.
  const resultadoAdmin = await criarOuAtualizarAdmin(prisma, admin, {
    atualizarExistente: false,
  });

  console.log(
    [
      `[seed-dev] evento ${massa.eventoId} ${massa.eventoCriado ? 'criado' : 'já existia'}` +
        (massa.eventoAtivo
          ? ' (ativo)'
          : ' (inativo: já havia outro evento ativo)'),
      `[seed-dev] inseridos: ${massa.dias} dia(s), ${massa.grupos} grupo(s), ${massa.fatores} fator(es) de presença`,
      `[seed-dev] administrador ${admin.ADMIN_EMAIL} ${resultadoAdmin === 'mantido' ? 'já existia (mantido sem alterar a senha; use npm run db:admin para atualizar)' : resultadoAdmin}`,
    ].join('\n'),
  );
});
