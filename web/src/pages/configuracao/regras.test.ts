import assert from 'node:assert/strict';
import { test } from 'node:test';
import { montarConfiguracao, paraFormulario, type Configuracao } from './regras.ts';

const exemplo: Configuracao = {
  conversaoPontoExtra: [
    { colocacao: 1, pontoExtra: 1 },
    { colocacao: 2, pontoExtra: 0.8 },
  ],
  itensBonificacao: [{ id: 1, nome: 'Uniformização', teto: 10 }],
  penalidadeMin: 10,
  penalidadeMax: 50,
  fatoresPresenca: [
    { diasPresentes: 2, fator: 1 },
    { diasPresentes: 1, fator: 0.5 },
    { diasPresentes: 0, fator: 0 },
  ],
  criteriosDesempate: [
    { ordem: 2, tipo: 'MENOR_PENALIDADE', desafioId: null, descricao: 'x' },
    { ordem: 1, tipo: 'MAIOR_PONTUACAO_DESAFIO', desafioId: 3, descricao: 'y' },
  ],
};
const desafios = [{ id: 3, nome: 'Hackathon' }];

test('formulário tem uma linha por grupo e por quantidade de dias presentes', () => {
  const f = paraFormulario(exemplo, 3, 2);
  assert.deepEqual(f.conversao, ['1', '0,8', '']);
  assert.deepEqual(f.fatores, ['0', '50', '100']);
  assert.deepEqual(
    f.criterios.map((c) => c.tipo),
    ['MAIOR_PONTUACAO_DESAFIO', 'MENOR_PENALIDADE'],
  );
});

test('ida e volta devolve a mesma configuração, com ordem e descrição geradas', () => {
  const r = montarConfiguracao(paraFormulario(exemplo, 2, 2), desafios);
  assert.ok('dados' in r);
  assert.deepEqual(r.dados.conversaoPontoExtra, exemplo.conversaoPontoExtra);
  assert.deepEqual(r.dados.fatoresPresenca, [...exemplo.fatoresPresenca].reverse());
  assert.deepEqual(r.dados.criteriosDesempate, [
    { ordem: 1, tipo: 'MAIOR_PONTUACAO_DESAFIO', desafioId: 3, descricao: 'Maior pontuação em Hackathon' },
    { ordem: 2, tipo: 'MENOR_PENALIDADE', desafioId: null, descricao: 'Menor penalidade' },
  ]);
});

test('aponta o primeiro erro de preenchimento', () => {
  const base = paraFormulario(exemplo, 2, 2);
  const erro = (mudanca: object) => {
    const r = montarConfiguracao({ ...base, ...mudanca }, desafios);
    return 'erro' in r ? r.erro : '';
  };
  assert.match(erro({ conversao: ['1', ''] }), /2º lugar/);
  assert.match(erro({ itens: [{ nome: 'Grito', teto: '0' }] }), /teto/);
  assert.match(erro({ penalidadeMin: '60' }), /mínima/);
  assert.match(erro({ fatores: ['0', '150', '100'] }), /entre 0% e 100%/);
  assert.match(erro({ criterios: [{ tipo: 'MAIOR_PONTUACAO_DESAFIO', desafioId: null }] }), /desafio/);
});
