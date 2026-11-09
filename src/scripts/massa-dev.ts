import type { PrismaClient } from '../generated/prisma/client.js';

// Massa de desenvolvimento baseada em db/dev-seed da equipe de banco
// (01_massa_cadastro.sql e 02_carga_fator_presenca.sql), com dois ajustes:
// - datas oficiais do evento: 19 e 20/11/2026 (a massa original usava 26 e 27/11);
// - cores dos grupos em hex #RRGGBB, como o contrato com o front exige.
// Critérios de desempate ficam de fora até a migração que os alinha ao contrato.

export const EVENTO_DEV = {
  nome: 'Arena Comp 2026',
  ano: 2026,
  dataInicio: '2026-11-19',
  dataFim: '2026-11-20',
  quantidadeDias: 2,
  penalidadeMin: 10,
  penalidadeMax: 50,
} as const;

export const DIAS_DEV = [
  { numeroDia: 1, data: '2026-11-19' },
  { numeroDia: 2, data: '2026-11-20' },
] as const;

export const GRUPOS_DEV = [
  { nome: 'GRACE', cor: '#FFFFFF' },
  { nome: 'PRESSMAN', cor: '#1E88E5' },
  { nome: 'KUROSE', cor: '#43A047' },
  { nome: 'TURING', cor: '#212121' },
  { nome: 'SOMMERVILLE', cor: '#FB8C00' },
  { nome: 'ADA', cor: '#8E24AA' },
] as const;

// Regimento, Art. 17, §§ 1 a 3: nenhum dia = 0, todos os dias = 1, parcial = 0,5.
export function fatoresPresenca(
  quantidadeDias: number,
): { diasPresentes: number; fator: number }[] {
  return Array.from({ length: quantidadeDias + 1 }, (_, diasPresentes) => ({
    diasPresentes,
    fator: diasPresentes === 0 ? 0 : diasPresentes === quantidadeDias ? 1 : 0.5,
  }));
}

export interface ResumoMassa {
  eventoId: number;
  eventoCriado: boolean;
  eventoAtivo: boolean;
  dias: number;
  grupos: number;
  fatores: number;
}

const data = (iso: string) => new Date(`${iso}T00:00:00Z`);

// Idempotente: só insere o que falta e nunca altera o que já existe. Para
// recomeçar do zero, use `npx prisma migrate reset` e rode o seed de novo.
export async function aplicarMassaDev(
  prisma: PrismaClient,
): Promise<ResumoMassa> {
  return prisma.$transaction(async (tx) => {
    let evento = await tx.evento.findUnique({
      where: { nome_ano: { nome: EVENTO_DEV.nome, ano: EVENTO_DEV.ano } },
    });
    const eventoCriado = !evento;

    if (!evento) {
      // Só um evento pode estar ativo (ux_evento_ativo); não mexe em outro.
      const outroAtivo = await tx.evento.count({ where: { ativo: true } });
      evento = await tx.evento.create({
        data: {
          ...EVENTO_DEV,
          dataInicio: data(EVENTO_DEV.dataInicio),
          dataFim: data(EVENTO_DEV.dataFim),
          ativo: outroAtivo === 0,
        },
      });
    }

    const eventoId = evento.id;

    // skipDuplicates vira ON CONFLICT DO NOTHING e cobre também os índices
    // únicos de expressão (lower(nome) e lower(cor) dos grupos).
    const dias = await tx.diaEvento.createMany({
      data: DIAS_DEV.map((dia) => ({ ...dia, eventoId, data: data(dia.data) })),
      skipDuplicates: true,
    });
    const grupos = await tx.grupo.createMany({
      data: GRUPOS_DEV.map((grupo) => ({ ...grupo, eventoId })),
      skipDuplicates: true,
    });
    const fatores = await tx.fatorPresenca.createMany({
      data: fatoresPresenca(evento.quantidadeDias).map((fator) => ({
        ...fator,
        eventoId,
      })),
      skipDuplicates: true,
    });

    return {
      eventoId,
      eventoCriado,
      eventoAtivo: evento.ativo,
      dias: dias.count,
      grupos: grupos.count,
      fatores: fatores.count,
    };
  });
}
