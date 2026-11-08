// Datas são sempre "AAAA-MM-DD" e calculadas em UTC, para não sofrer com fuso horário.

const DIA_MS = 86_400_000;
const paraMs = (data: string) => Date.parse(`${data}T00:00:00Z`);

export function somarDias(data: string, dias: number): string {
  return new Date(paraMs(data) + dias * DIA_MS).toISOString().slice(0, 10);
}

/** Quantos dias cabem no período, contando início e fim. 0 se o período for inválido. */
export function diasNoPeriodo(inicio: string, fim: string): number {
  if (!inicio || !fim) return 0;
  return Math.max(0, Math.round((paraMs(fim) - paraMs(inicio)) / DIA_MS) + 1);
}

/** Erro de preenchimento dos dias, ou null se estiver tudo certo. */
export function validarDias(datas: string[], inicio: string, fim: string): string | null {
  if (datas.some((d) => !d)) return 'Preencha a data de todos os dias.';
  if (datas.some((d) => d < inicio || d > fim)) return 'Todos os dias precisam estar dentro do período do evento.';
  if (datas.some((d, i) => i > 0 && d <= datas[i - 1])) return 'Os dias precisam estar em ordem, sem datas repetidas.';
  return null;
}

type Dia = { id: number; numeroDia: number; data: string };

/**
 * O que fazer com os dias já cadastrados para chegar às datas desejadas (dia N = datas[N-1]).
 * O banco recusa mudar o período com dias fora dele e repetir data no evento, então um dia
 * que muda de data é excluído e recriado, nunca alterado. Excluir dia com desafio ou presença
 * dá 409 na API, que é o comportamento certo.
 */
export function planoDias(existentes: Dia[], datas: string[]) {
  const mantidos = existentes.filter((d) => datas[d.numeroDia - 1] === d.data);
  return {
    excluir: existentes.filter((d) => !mantidos.includes(d)).map((d) => d.id),
    criar: datas
      .map((data, i) => ({ numeroDia: i + 1, data }))
      .filter((novo) => !mantidos.some((d) => d.numeroDia === novo.numeroDia)),
  };
}
