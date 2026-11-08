import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aplicarPendentes, diaInicial, filtrar, resumo, type Presenca } from './presencas.ts';

const p = (participanteId: number, nome: string, grupoId: number, presente: boolean): Presenca => ({
  participanteId,
  matricula: `2026-${100 + participanteId}`,
  nome,
  turma: 'ES',
  grupoId,
  grupo: `G${grupoId}`,
  presente,
});
const dados = [p(1, 'Lucas Vitorino', 1, true), p(2, 'Sofia Moreira', 1, false), p(3, 'Árthur Pires', 2, false)];

test('marcação pendente vale por cima da API', () => {
  const r = aplicarPendentes(dados, { 2: true, 1: false });
  assert.deepEqual(
    r.map((x) => x.presente),
    [false, true, false],
  );
  assert.equal(dados[0].presente, true, 'não altera a lista original');
});

test('filtra por grupo e por nome ou matrícula, sem diferenciar maiúsculas', () => {
  assert.deepEqual(
    filtrar(dados, '1', '').map((x) => x.participanteId),
    [1, 2],
  );
  assert.deepEqual(
    filtrar(dados, '', 'árTHUR').map((x) => x.participanteId),
    [3],
  );
  assert.deepEqual(
    filtrar(dados, '', '2026-102').map((x) => x.participanteId),
    [2],
  );
});

test('resumo conta presentes e ausentes', () => {
  assert.deepEqual(resumo(dados), { total: 3, presentes: 1, ausentes: 2 });
  assert.deepEqual(resumo([]), { total: 0, presentes: 0, ausentes: 0 });
});

test('abre no dia de hoje quando ele é dia do evento', () => {
  const dias = [
    { id: 1, data: '2026-11-23' },
    { id: 2, data: '2026-11-24' },
  ];
  assert.equal(diaInicial(dias, '2026-11-24')?.id, 2);
  assert.equal(diaInicial(dias, '2026-11-08')?.id, 1);
  assert.equal(diaInicial([], '2026-11-08'), undefined);
});
