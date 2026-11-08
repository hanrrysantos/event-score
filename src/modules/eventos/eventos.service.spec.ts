import {
  BadRequestException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service.js';
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

const eventoPersistido = {
  id: 1,
  nome: 'Arena Comp 2026',
  ano: 2026,
  dataInicio: new Date('2026-11-20T00:00:00.000Z'),
  dataFim: new Date('2026-11-22T00:00:00.000Z'),
  quantidadeDias: 3,
  ativo: true,
};

type PrismaMock = {
  evento: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

function criarPrismaMock(): PrismaMock {
  const prisma: PrismaMock = {
    evento: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  prisma.$transaction.mockImplementation(
    async (operacao: (tx: PrismaMock) => Promise<unknown>) => operacao(prisma),
  );

  return prisma;
}

describe('EventosService', () => {
  let prisma: PrismaMock;
  let service: EventosService;

  beforeEach(() => {
    prisma = criarPrismaMock();
    service = new EventosService(prisma as unknown as PrismaService);
  });

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

  it('persiste um novo evento validado e sempre inativo', async () => {
    prisma.evento.create.mockResolvedValue({
      ...eventoPersistido,
      ativo: false,
    });

    await expect(
      service.criar({
        ...eventoValido,
        nome: '  Arena Comp 2026  ',
      }),
    ).resolves.toEqual({ ...eventoValido, ativo: false });
    expect(prisma.evento.create).toHaveBeenCalledWith({
      data: {
        nome: 'Arena Comp 2026',
        ano: 2026,
        dataInicio: new Date('2026-11-20T00:00:00.000Z'),
        dataFim: new Date('2026-11-22T00:00:00.000Z'),
        quantidadeDias: 3,
        ativo: false,
      },
    });
  });

  it('lista os eventos em ordem determinística e formata as datas', async () => {
    prisma.evento.findMany.mockResolvedValue([eventoPersistido]);

    await expect(service.listar()).resolves.toEqual([eventoValido]);
    expect(prisma.evento.findMany).toHaveBeenCalledWith({
      orderBy: [{ ano: 'desc' }, { dataInicio: 'desc' }, { id: 'desc' }],
    });
  });

  it('consulta eventos por id e o período persistido', async () => {
    prisma.evento.findUnique.mockResolvedValue(eventoPersistido);

    await expect(service.buscarPorId(1)).resolves.toEqual(eventoValido);
    await expect(service.obterPeriodoPorId(1)).resolves.toEqual({
      eventoId: 1,
      dataInicio: '2026-11-20',
      dataFim: '2026-11-22',
      quantidadeDias: 3,
    });
    expect(prisma.evento.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('informa quando o evento solicitado não existe', async () => {
    prisma.evento.findUnique.mockResolvedValue(null);

    await expect(service.buscarPorId(404)).rejects.toThrow(
      new NotFoundException('Evento não encontrado'),
    );
  });

  it('consulta o único evento ativo', async () => {
    prisma.evento.findFirst.mockResolvedValue(eventoPersistido);

    await expect(service.buscarAtivo()).resolves.toEqual(eventoValido);
    expect(prisma.evento.findFirst).toHaveBeenCalledWith({
      where: { ativo: true },
    });
  });

  it('informa quando não há evento ativo', async () => {
    prisma.evento.findFirst.mockResolvedValue(null);

    await expect(service.buscarAtivo()).rejects.toThrow(
      new NotFoundException('Nenhum evento está ativo no momento'),
    );
  });

  it('atualiza dados parciais sem alterar o estado ativo', async () => {
    prisma.evento.findUnique.mockResolvedValue(eventoPersistido);
    prisma.evento.update.mockResolvedValue({
      ...eventoPersistido,
      nome: 'Arena Comp 2026 - Oficial',
      dataFim: new Date('2026-11-23T00:00:00.000Z'),
    });

    await expect(
      service.atualizar(1, {
        nome: ' Arena Comp 2026 - Oficial ',
        dataFim: '2026-11-23',
      }),
    ).resolves.toEqual({
      ...eventoValido,
      nome: 'Arena Comp 2026 - Oficial',
      dataFim: '2026-11-23',
    });
    expect(prisma.evento.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        nome: 'Arena Comp 2026 - Oficial',
        ano: 2026,
        dataInicio: new Date('2026-11-20T00:00:00.000Z'),
        dataFim: new Date('2026-11-23T00:00:00.000Z'),
        quantidadeDias: 3,
      },
    });
  });

  it('troca o evento ativo dentro de uma única transação', async () => {
    prisma.evento.findUnique.mockResolvedValue({
      ...eventoPersistido,
      id: 2,
      ativo: false,
    });
    prisma.evento.update.mockResolvedValue({
      ...eventoPersistido,
      id: 2,
      ativo: true,
    });

    await expect(service.ativar(2)).resolves.toMatchObject({
      id: 2,
      ativo: true,
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.evento.updateMany).toHaveBeenCalledWith({
      where: { ativo: true, NOT: { id: 2 } },
      data: { ativo: false },
    });
    expect(prisma.evento.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { ativo: true },
    });
  });

  it('mantém a ativação idempotente quando o evento já está ativo', async () => {
    prisma.evento.findUnique.mockResolvedValue(eventoPersistido);

    await expect(service.ativar(1)).resolves.toEqual(eventoValido);
    expect(prisma.evento.updateMany).not.toHaveBeenCalled();
    expect(prisma.evento.update).not.toHaveBeenCalled();
  });

  it('não altera eventos quando a ativação aponta para um id inexistente', async () => {
    prisma.evento.findUnique.mockResolvedValue(null);

    await expect(service.ativar(404)).rejects.toThrow(
      new NotFoundException('Evento não encontrado'),
    );
    expect(prisma.evento.updateMany).not.toHaveBeenCalled();
    expect(prisma.evento.update).not.toHaveBeenCalled();
  });
});
