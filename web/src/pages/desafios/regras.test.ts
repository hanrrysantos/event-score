import assert from 'node:assert/strict';
import { test } from 'node:test';
import { montarDesafio, paraFormulario, type Desafio } from './regras.ts';

const hackathon: Desafio = {
  id: 3,
  nome: 'Hackathon',
  descricao: '6 horas',
  diaId: 2,
  pontosColocacao: [
    { colocacao: 1, pontos: 100 },
    { colocacao: 2, pontos: 80 },
  ],
};

test('formulário tem uma linha por grupo, mesmo que o desafio tenha menos', () => {
  assert.deepEqual(paraFormulario(hackathon, 3).pontos, ['100', '80', '']);
  assert.deepEqual(paraFormulario(undefined, 2), { nome: '', descricao: '', diaId: '', pontos: ['', ''] });
});

test('monta o envio no formato do contrato', () => {
  assert.deepEqual(montarDesafio(paraFormulario(hackathon, 2), 2), {
    dados: { nome: 'Hackathon', descricao: '6 horas', diaId: 2, pontosColocacao: hackathon.pontosColocacao },
  });
});

test('recusa nome, dia ou pontos faltando e evento sem grupos', () => {
  const base = paraFormulario(hackathon, 2);
  const erro = (f: object, grupos = 2) => {
    const r = montarDesafio({ ...base, ...f }, grupos);
    return 'erro' in r ? r.erro : '';
  };
  assert.match(erro({ nome: ' ' }), /nome/);
  assert.match(erro({ diaId: '' }), /dia/);
  assert.match(erro({ pontos: ['100', '7,5'] }), /2º lugar/);
  assert.match(erro({ pontos: ['100', ''] }), /2º lugar/);
  assert.match(erro({ pontos: [] }, 0), /grupos/);
  assert.match(erro({}, 3), /uma linha por grupo \(3\)/);
});
