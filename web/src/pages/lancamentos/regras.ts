import { lerNumero } from '../../numero.ts';

// Formatos do contrato v0.3 (lançamentos); ainda fora do OpenAPI oficial.
export type Resultado = { id: number | null; grupoId: number; colocacao: number | null; ausente: boolean; pontos: number };
export type Bonificacao = { grupoId: number; itens: { itemBonificacaoId: number; valor: number }[]; total: number };
export type Penalidade = { id: number; grupoId: number; pontos: number; descricao: string; justificativa: string };
export type LinhaClassificacao = {
  posicao: number;
  grupoId: number;
  grupo: string;
  cor: string;
  pontosDesafios: number;
  bonificacao: number;
  penalidade: number;
  total: number;
  empatado: boolean;
};
export type Classificacao = {
  dados: LinhaClassificacao[];
  resumo: { desafiosLancados: number; desafiosTotais: number; empatesPendentes: number[][] };
};
export type Auditoria = { dataHora: string; usuario: string; operacao: string; valorAnterior: string | null; valorNovo: string | null };

type Lancamento = { grupoId: number; colocacao: number | null; ausente: boolean };

/** RF08/RF09: todo grupo tem colocação ou está ausente, e duas colocações nunca se repetem. */
export function validarColocacoes(linhas: Lancamento[], nomeDoGrupo: (id: number) => string): string | null {
  const semColocacao = linhas.find((l) => !l.ausente && l.colocacao === null);
  if (semColocacao) return `Escolha a colocação de ${nomeDoGrupo(semColocacao.grupoId)} ou marque como ausente.`;
  const usadas = new Map<number, number>();
  for (const l of linhas) {
    if (l.ausente || l.colocacao === null) continue;
    const outro = usadas.get(l.colocacao);
    if (outro !== undefined) return `${nomeDoGrupo(outro)} e ${nomeDoGrupo(l.grupoId)} estão na mesma colocação (${l.colocacao}º).`;
    usadas.set(l.colocacao, l.grupoId);
  }
  return null;
}

/** Corpo do PUT: grupo ausente vai com colocação null e recebe 0 ponto (RF09). */
export const corpoColocacoes = (linhas: Lancamento[]) =>
  linhas.map((l) => ({ grupoId: l.grupoId, colocacao: l.ausente ? null : l.colocacao, ausente: l.ausente }));

export const pontosDaColocacao = (colocacao: number | null, tabela: { colocacao: number; pontos: number }[]) =>
  colocacao === null ? 0 : (tabela.find((p) => p.colocacao === colocacao)?.pontos ?? 0);

/** RF10: cada item aceita valor inteiro de 0 até o seu teto. */
export function montarBonificacao(
  valores: Record<number, string>,
  itens: { id?: number; nome: string; teto: number }[],
): { dados: { itemBonificacaoId: number; valor: number }[] } | { erro: string } {
  const dados = [];
  for (const item of itens) {
    if (item.id === undefined) continue;
    const texto = valores[item.id] ?? '';
    const valor = texto.trim() === '' ? 0 : lerNumero(texto);
    if (!Number.isInteger(valor) || valor < 0) return { erro: `${item.nome}: informe um número inteiro.` };
    if (valor > item.teto) return { erro: `${item.nome}: o valor passa do teto de ${item.teto}.` };
    dados.push({ itemBonificacaoId: item.id, valor });
  }
  return { dados };
}

/** RF11: pontos dentro da faixa configurada e justificativa obrigatória. */
export function montarPenalidade(
  f: { grupoId: string; pontos: string; descricao: string; justificativa: string },
  minimo: number,
  maximo: number,
): { dados: Omit<Penalidade, 'id'> } | { erro: string } {
  if (!f.grupoId) return { erro: 'Escolha o grupo penalizado.' };
  const pontos = lerNumero(f.pontos);
  if (!Number.isInteger(pontos) || pontos < minimo || pontos > maximo) return { erro: `A penalidade deve estar entre ${minimo} e ${maximo} pontos.` };
  if (!f.descricao.trim()) return { erro: 'Descreva a penalidade.' };
  if (!f.justificativa.trim()) return { erro: 'A justificativa é obrigatória.' };
  return { dados: { grupoId: Number(f.grupoId), pontos, descricao: f.descricao.trim(), justificativa: f.justificativa.trim() } };
}

/** RF14: os grupos empatados recebem posições seguidas a partir da posição em que empataram, na ordem escolhida. */
export const posicoesDesempate = (ordem: number[], posicaoInicial: number) =>
  ordem.map((grupoId, i) => ({ grupoId, posicao: posicaoInicial + i }));

/** Posição em que cada empate pendente aconteceu (a menor posição entre os grupos dele). */
export const posicaoDoEmpate = (grupoIds: number[], classificacao: LinhaClassificacao[]) =>
  Math.min(...classificacao.filter((l) => grupoIds.includes(l.grupoId)).map((l) => l.posicao));

/**
 * Um POST /desempates resolve todos os empates pendentes de uma vez, porque um novo envio substitui o
 * anterior. Recebe a ordem escolhida em cada empate e devolve as posições de todos juntos.
 */
export const posicoesDeTodosEmpates = (ordens: number[][], classificacao: LinhaClassificacao[]) =>
  ordens.flatMap((ordem) => posicoesDesempate(ordem, posicaoDoEmpate(ordem, classificacao)));
