/**
 * Critérios de desempate da classificação (RF13), conforme contrato T06.
 * `MAIOR_PONTUACAO_DESAFIO` exige `desafioId` associado ao critério.
 */
export enum TipoCriterioDesempate {
  MAIOR_PONTUACAO_DESAFIO = 'MAIOR_PONTUACAO_DESAFIO',
  MAIOR_SOMA_DESAFIOS = 'MAIOR_SOMA_DESAFIOS',
  MAIOR_BONIFICACAO = 'MAIOR_BONIFICACAO',
  MENOR_PENALIDADE = 'MENOR_PENALIDADE',
  MAIOR_PRESENCA = 'MAIOR_PRESENCA',
}
