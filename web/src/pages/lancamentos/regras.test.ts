import assert from 'node:assert/strict';
import { test } from 'node:test';
import { corpoColocacoes, montarBonificacao, montarPenalidade, pontosDaColocacao, posicoesDesempate, validarColocacoes } from './regras.ts';

const nome = (id: number) => ['', 'Alfa', 'Beta', 'Gama'][id];

test('colocações: exige colocação ou ausência e recusa repetição', () => {
  assert.equal(
    validarColocacoes(
      [
        { grupoId: 1, colocacao: 1, ausente: false },
        { grupoId: 2, colocacao: null, ausente: true },
        { grupoId: 3, colocacao: 2, ausente: false },
      ],
      nome,
    ),
    null,
  );
  assert.match(validarColocacoes([{ grupoId: 2, colocacao: null, ausente: false }], nome)!, /Beta/);
  assert.match(
    validarColocacoes(
      [
        { grupoId: 1, colocacao: 2, ausente: false },
        { grupoId: 3, colocacao: 2, ausente: false },
      ],
      nome,
    )!,
    /Alfa e Gama .*2º/,
  );
});

test('grupo ausente vai sem colocação e não pontua', () => {
  assert.deepEqual(corpoColocacoes([{ grupoId: 1, colocacao: 3, ausente: true }]), [{ grupoId: 1, colocacao: null, ausente: true }]);
  const tabela = [
    { colocacao: 1, pontos: 100 },
    { colocacao: 2, pontos: 80 },
  ];
  assert.equal(pontosDaColocacao(2, tabela), 80);
  assert.equal(pontosDaColocacao(null, tabela), 0);
});

test('bonificação respeita o teto de cada item', () => {
  const itens = [
    { id: 1, nome: 'Uniformização', teto: 10 },
    { id: 2, nome: 'Grito', teto: 10 },
  ];
  assert.deepEqual(montarBonificacao({ 1: '10', 2: '' }, itens), {
    dados: [
      { itemBonificacaoId: 1, valor: 10 },
      { itemBonificacaoId: 2, valor: 0 },
    ],
  });
  assert.match((montarBonificacao({ 1: '11' }, itens) as { erro: string }).erro, /teto de 10/);
  assert.match((montarBonificacao({ 1: '2,5' }, itens) as { erro: string }).erro, /inteiro/);
});

test('penalidade dentro da faixa e com justificativa', () => {
  const ok = { grupoId: '2', pontos: '20', descricao: 'Atraso', justificativa: 'Chegou tarde' };
  assert.deepEqual(montarPenalidade(ok, 10, 50), { dados: { grupoId: 2, pontos: 20, descricao: 'Atraso', justificativa: 'Chegou tarde' } });
  assert.match((montarPenalidade({ ...ok, pontos: '5' }, 10, 50) as { erro: string }).erro, /entre 10 e 50/);
  assert.match((montarPenalidade({ ...ok, justificativa: ' ' }, 10, 50) as { erro: string }).erro, /justificativa/);
});

test('desempate dá posições seguidas na ordem escolhida', () => {
  assert.deepEqual(posicoesDesempate([2, 1], 3), [
    { grupoId: 2, posicao: 3 },
    { grupoId: 1, posicao: 4 },
  ]);
});
