import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fatorParaPercentual, lerNumero, mostrarNumero, percentualParaFator } from './numero.ts';

test('lê número com vírgula ou ponto e recusa texto inválido', () => {
  assert.equal(lerNumero('0,8'), 0.8);
  assert.equal(lerNumero(' 1.5 '), 1.5);
  assert.equal(lerNumero('10'), 10);
  assert.ok(Number.isNaN(lerNumero('')));
  assert.ok(Number.isNaN(lerNumero('1,2,3')));
  assert.ok(Number.isNaN(lerNumero('abc')));
});

test('converte fator e percentual sem erro de arredondamento', () => {
  assert.equal(mostrarNumero(0.8), '0,8');
  assert.equal(fatorParaPercentual(0.5), '50');
  assert.equal(fatorParaPercentual(0.333), '33,3');
  assert.equal(percentualParaFator('50'), 0.5);
  assert.equal(percentualParaFator('33,3'), 0.333);
});
