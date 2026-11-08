import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { EventosService } from './eventos.service.js';
import type { EventoCadastrado } from './eventos.service.js';

const eventoValido: EventoCadastrado = {
  id: 1,
  nome: 'Arena Comp 2026',
  ano: 2026,
  dataInicio: '2026-11-20',
  dataFim: '2026-11-22',
  quantidadeDias: 3,
  ativo: true,
};

describe('EventosService', () => {
  const service = new EventosService();

  it('normaliza o nome e prepara novos eventos como inativos', () => {
    const entradaComEstadoExterno = {
      ...eventoValido,
      nome: '  Arena Comp 2026  ',
      ativo: true,
    };

    const resultado = service.prepararCriacao(entradaComEstadoExterno);

    expect(resultado).toEqual({
      nome: 'Arena Comp 2026',
      ano: 2026,
      dataInicio: '2026-11-20',
      dataFim: '2026-11-22',
      quantidadeDias: 3,
      ativo: false,
    });
  });

  it.each([
    { nome: '   ' },
    { nome: 'A'.repeat(101) },
    { ano: 1999 },
    { ano: 2026.5 },
    { quantidadeDias: 0 },
    { quantidadeDias: 1.5 },
    { dataInicio: '20/11/2026' },
    { dataFim: '2026-02-30' },
  ])('rejeita dados cadastrais inválidos: %o', (alteracao) => {
    expect(() =>
      service.prepararCriacao({ ...eventoValido, ...alteracao }),
    ).toThrow(BadRequestException);
  });

  it('rejeita data final anterior à data inicial', () => {
    expect(() =>
      service.prepararCriacao({
        ...eventoValido,
        dataInicio: '2026-11-23',
        dataFim: '2026-11-22',
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('rejeita quantidade de dias superior ao período inclusivo', () => {
    expect(() =>
      service.prepararCriacao({
        ...eventoValido,
        dataInicio: '2026-11-20',
        dataFim: '2026-11-21',
        quantidadeDias: 3,
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('aceita evento de um único dia', () => {
    expect(
      service.prepararCriacao({
        ...eventoValido,
        dataInicio: '2026-11-20',
        dataFim: '2026-11-20',
        quantidadeDias: 1,
      }),
    ).toMatchObject({
      dataInicio: '2026-11-20',
      dataFim: '2026-11-20',
      quantidadeDias: 1,
    });
  });

  it('combina atualização parcial e preserva identidade e estado ativo', () => {
    const resultado = service.prepararAtualizacao(eventoValido, {
      nome: '  Arena Comp 2026 - Edição Oficial  ',
      dataFim: '2026-11-23',
    });

    expect(resultado).toEqual({
      ...eventoValido,
      nome: 'Arena Comp 2026 - Edição Oficial',
      dataFim: '2026-11-23',
    });
  });

  it('revalida o período completo depois de uma atualização parcial', () => {
    expect(() =>
      service.prepararAtualizacao(eventoValido, {
        dataInicio: '2026-11-23',
      }),
    ).toThrow(UnprocessableEntityException);
  });

  it('expõe somente o período necessário aos módulos vizinhos', () => {
    expect(service.obterPeriodo(eventoValido)).toEqual({
      eventoId: 1,
      dataInicio: '2026-11-20',
      dataFim: '2026-11-22',
      quantidadeDias: 3,
    });
  });

  it('impede que um recurso de outro evento seja aceito no contexto atual', () => {
    expect(() => service.validarPertencimentoAoEvento(1, 2)).toThrow(
      NotFoundException,
    );
    expect(() => service.validarPertencimentoAoEvento(1, 1)).not.toThrow();
  });
});
