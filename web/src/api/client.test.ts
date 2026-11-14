import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mensagemDeErro, nomeDoArquivo } from './client.ts';

test('nome do arquivo vem do Content-Disposition, com acento ou sem aspas', () => {
  assert.equal(nomeDoArquivo('attachment; filename="relatorio-final-arena-comp-2026.xlsx"', 'x'), 'relatorio-final-arena-comp-2026.xlsx');
  assert.equal(nomeDoArquivo('attachment; filename=parcial.pdf', 'x'), 'parcial.pdf');
  assert.equal(nomeDoArquivo("attachment; filename*=UTF-8''relat%C3%B3rio.pdf", 'x'), 'relatório.pdf');
  assert.equal(nomeDoArquivo(null, 'padrao.pdf'), 'padrao.pdf');
});

test('mensagem de erro no formato do NestJS', () => {
  assert.equal(mensagemDeErro(400, { message: ['nome vazio', 'cor inválida'] }), 'nome vazio\ncor inválida');
  assert.equal(mensagemDeErro(422, { message: 'Fora da faixa' }), 'Fora da faixa');
  assert.equal(mensagemDeErro(500, null), 'Erro 500 ao falar com o servidor.');
});
