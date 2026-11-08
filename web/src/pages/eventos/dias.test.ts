import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diasNoPeriodo, planoDias, somarDias, validarDias } from './dias.ts';

test('conta os dias do período incluindo início e fim', () => {
  assert.equal(diasNoPeriodo('2026-11-23', '2026-11-24'), 2);
  assert.equal(diasNoPeriodo('2026-10-31', '2026-11-01'), 2);
  assert.equal(diasNoPeriodo('2026-11-24', '2026-11-23'), 0);
  assert.equal(somarDias('2026-12-31', 1), '2027-01-01');
});

test('valida datas fora do período, repetidas ou fora de ordem', () => {
  assert.equal(validarDias(['2026-11-23', '2026-11-24'], '2026-11-23', '2026-11-24'), null);
  assert.match(validarDias(['2026-11-22'], '2026-11-23', '2026-11-24')!, /período/);
  assert.match(validarDias(['2026-11-24', '2026-11-23'], '2026-11-23', '2026-11-24')!, /ordem/);
  assert.match(validarDias(['2026-11-23', '2026-11-23'], '2026-11-23', '2026-11-24')!, /ordem/);
  assert.match(validarDias([''], '2026-11-23', '2026-11-24')!, /Preencha/);
});

test('evento novo cria todos os dias', () => {
  assert.deepEqual(planoDias([], ['2026-11-23', '2026-11-24']), {
    excluir: [],
    criar: [
      { numeroDia: 1, data: '2026-11-23' },
      { numeroDia: 2, data: '2026-11-24' },
    ],
  });
});

test('mantém dias iguais, recria os que mudaram de data e exclui os que sobraram', () => {
  const existentes = [
    { id: 10, numeroDia: 1, data: '2026-11-23' },
    { id: 11, numeroDia: 2, data: '2026-11-24' },
    { id: 12, numeroDia: 3, data: '2026-11-25' },
  ];
  assert.deepEqual(planoDias(existentes, ['2026-11-23', '2026-11-26']), {
    excluir: [11, 12],
    criar: [{ numeroDia: 2, data: '2026-11-26' }],
  });
  assert.deepEqual(planoDias(existentes, ['2026-11-23', '2026-11-24', '2026-11-25']), { excluir: [], criar: [] });
});
