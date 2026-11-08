import { fatorParaPercentual, lerNumero, mostrarNumero, percentualParaFator } from '../../numero.ts';

// Formato do contrato v0.3 (GET/PUT /eventos/{eventoId}/configuracao); ainda fora do OpenAPI oficial.
export const TIPOS_CRITERIO = {
  MAIOR_PONTUACAO_DESAFIO: 'Maior pontuação em um desafio',
  MAIOR_SOMA_DESAFIOS: 'Maior soma nos desafios',
  MAIOR_BONIFICACAO: 'Maior bonificação',
  MENOR_PENALIDADE: 'Menor penalidade',
  MAIOR_PRESENCA: 'Maior presença',
} as const;
export type TipoCriterio = keyof typeof TIPOS_CRITERIO;

export type Configuracao = {
  conversaoPontoExtra: { colocacao: number; pontoExtra: number }[];
  itensBonificacao: { id?: number; nome: string; teto: number }[];
  penalidadeMin: number;
  penalidadeMax: number;
  fatoresPresenca: { diasPresentes: number; fator: number }[];
  criteriosDesempate: { ordem: number; tipo: TipoCriterio; desafioId: number | null; descricao: string }[];
};

/** O que a tela edita: números como texto, do jeito que a pessoa digitou. */
export type Formulario = {
  conversao: string[]; // índice = colocação - 1
  itens: { id?: number; nome: string; teto: string }[];
  penalidadeMin: string;
  penalidadeMax: string;
  fatores: string[]; // índice = dias presentes, em %
  criterios: { tipo: TipoCriterio; desafioId: number | null }[];
};

/** Monta o formulário com uma linha por grupo e uma por quantidade de dias presentes (0 a quantidadeDias). */
export function paraFormulario(config: Configuracao, grupos: number, quantidadeDias: number): Formulario {
  const colocacoes = grupos || config.conversaoPontoExtra.length;
  const ponto = (c: number) => config.conversaoPontoExtra.find((p) => p.colocacao === c)?.pontoExtra;
  const fator = (d: number) => config.fatoresPresenca.find((f) => f.diasPresentes === d)?.fator;
  return {
    conversao: Array.from({ length: colocacoes }, (_, i) => {
      const v = ponto(i + 1);
      return v === undefined ? '' : mostrarNumero(v);
    }),
    itens: config.itensBonificacao.map((i) => ({ id: i.id, nome: i.nome, teto: String(i.teto) })),
    penalidadeMin: String(config.penalidadeMin ?? ''),
    penalidadeMax: String(config.penalidadeMax ?? ''),
    fatores: Array.from({ length: quantidadeDias + 1 }, (_, d) => {
      const v = fator(d);
      return v === undefined ? '' : fatorParaPercentual(v);
    }),
    criterios: [...config.criteriosDesempate]
      .sort((a, b) => a.ordem - b.ordem)
      .map((c) => ({ tipo: c.tipo, desafioId: c.desafioId })),
  };
}

const inteiro = (texto: string) => {
  const n = lerNumero(texto);
  return Number.isInteger(n) ? n : NaN;
};

/** Valida o formulário e devolve o corpo do PUT, ou a primeira mensagem de erro. */
export function montarConfiguracao(
  f: Formulario,
  desafios: { id: number; nome: string }[],
): { dados: Configuracao } | { erro: string } {
  const conversaoPontoExtra = f.conversao.map((t, i) => ({ colocacao: i + 1, pontoExtra: lerNumero(t) }));
  const conversaoRuim = conversaoPontoExtra.find((c) => !(c.pontoExtra >= 0));
  if (conversaoRuim) return { erro: `Informe o ponto extra do ${conversaoRuim.colocacao}º lugar (ex.: 0,8).` };

  const itensBonificacao = f.itens.map((i) => ({ ...(i.id ? { id: i.id } : {}), nome: i.nome.trim(), teto: inteiro(i.teto) }));
  if (itensBonificacao.some((i) => !i.nome)) return { erro: 'Todo item de bonificação precisa de nome.' };
  const itemRuim = itensBonificacao.find((i) => !(i.teto >= 1));
  if (itemRuim) return { erro: `O teto de "${itemRuim.nome}" precisa ser um número inteiro maior que zero.` };

  const penalidadeMin = inteiro(f.penalidadeMin);
  const penalidadeMax = inteiro(f.penalidadeMax);
  if (!(penalidadeMin >= 0) || !(penalidadeMax >= 0)) return { erro: 'Os limites de penalidade precisam ser números inteiros.' };
  if (penalidadeMin > penalidadeMax) return { erro: 'A penalidade mínima não pode ser maior que a máxima.' };

  const fatoresPresenca = f.fatores.map((t, d) => ({ diasPresentes: d, fator: percentualParaFator(t) }));
  if (fatoresPresenca.some((p) => !(p.fator >= 0 && p.fator <= 1))) return { erro: 'Cada fator de presença precisa estar entre 0% e 100%.' };

  const criteriosDesempate = [];
  for (const [i, c] of f.criterios.entries()) {
    if (c.tipo === 'MAIOR_PONTUACAO_DESAFIO') {
      const desafio = desafios.find((d) => d.id === c.desafioId);
      if (!desafio) return { erro: `Escolha o desafio do ${i + 1}º critério de desempate.` };
      criteriosDesempate.push({ ordem: i + 1, tipo: c.tipo, desafioId: desafio.id, descricao: `Maior pontuação em ${desafio.nome}` });
    } else {
      criteriosDesempate.push({ ordem: i + 1, tipo: c.tipo, desafioId: null, descricao: TIPOS_CRITERIO[c.tipo] });
    }
  }

  return { dados: { conversaoPontoExtra, itensBonificacao, penalidadeMin, penalidadeMax, fatoresPresenca, criteriosDesempate } };
}
