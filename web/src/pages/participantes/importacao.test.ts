import assert from 'node:assert/strict';
import { test } from 'node:test';
import { iniciais } from '../../texto.ts';
import { problemaDoArquivo, relatorioInconsistencias, type Previa } from './importacao.ts';

test('aceita só .csv e .xlsx de até 5 MB', () => {
  assert.equal(problemaDoArquivo({ name: 'Lista.CSV', size: 100 }), null);
  assert.equal(problemaDoArquivo({ name: 'lista.xlsx', size: 5 * 1024 * 1024 }), null);
  assert.match(problemaDoArquivo({ name: 'lista.pdf', size: 100 })!, /csv/);
  assert.match(problemaDoArquivo({ name: 'lista.csv', size: 6 * 1024 * 1024 })!, /5 MB/);
  assert.match(problemaDoArquivo({ name: 'lista.csv', size: 0 })!, /vazia/);
});

test('relatório lista só as linhas com erro', () => {
  const previa: Previa = {
    totalLinhas: 2,
    linhasValidas: 1,
    linhasComErro: 1,
    linhas: [
      { linha: 1, nome: 'Lucas', matricula: '1', turma: 'A', grupo: 'X', status: 'VALIDO', motivoErro: null },
      { linha: 40, nome: 'Pedro Santos', matricula: '2026-115', turma: 'A', grupo: null, status: 'ERRO', motivoErro: 'Grupo obrigatório' },
    ],
  };
  const texto = relatorioInconsistencias(previa, 'lista.csv');
  assert.match(texto, /Linha 40: Pedro Santos \(2026-115\) - Grupo obrigatório/);
  assert.doesNotMatch(texto, /Linha 1:/);
});

test('iniciais do nome', () => {
  assert.equal(iniciais('Lucas Vitorino'), 'LV');
  assert.equal(iniciais('ana'), 'AN');
  assert.equal(iniciais('  '), '?');
});
