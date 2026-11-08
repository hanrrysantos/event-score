/**
 * Critérios de desempate da classificação (RF13), conforme contrato T06 e a
 * migração V12. `MAIOR_PONTUACAO_DESAFIO` exige `desafioId`; os demais não
 * aceitam desafio. Presença não é critério: pelos requisitos, ela não altera a
 * colocação do grupo.
 */
export enum TipoCriterioDesempate {
  MAIOR_PONTUACAO_DESAFIO = 'MAIOR_PONTUACAO_DESAFIO',
  MAIOR_SOMA_DESAFIOS = 'MAIOR_SOMA_DESAFIOS',
  MAIOR_BONIFICACAO = 'MAIOR_BONIFICACAO',
  MENOR_PENALIDADE = 'MENOR_PENALIDADE',
}
