import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { PrismaService } from '../../prisma/prisma.service.js';
import { DiasEventoService } from './dias-evento.service.js';

const evento = {
  id: 1,
  dataInicio: new Date('2026-11-20T00:00:00.000Z'),
  dataFim: new Date('2026-11-22T00:00:00.000Z'),
  quantidadeDias: 3,
};

function makePrisma() {
  return {
    evento: { findUnique: vi.fn() },
    diaEvento: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn().mockResolvedValue([]),
    $queryRawUnsafe: vi.fn(),
  };
}

describe('DiasEventoService', () => {
  it('cria um dia válido e converte a resposta para data ISO', async () => {
    const prisma = makePrisma();
    prisma.evento.findUnique.mockResolvedValue(evento);
    prisma.diaEvento.findFirst.mockResolvedValue(null);
    prisma.diaEvento.create.mockResolvedValue({
      id: 5,
      eventoId: 1,
      numeroDia: 1,
      data: new Date('2026-11-20T00:00:00.000Z'),
    });
    const service = new DiasEventoService(prisma as unknown as PrismaService);

    await expect(
      service.create(1, { numeroDia: 1, data: '2026-11-20' }),
    ).resolves.toEqual({
      id: 5,
      numeroDia: 1,
      data: '2026-11-20',
    });
  });

  it('rejeita evento inexistente', async () => {
    const prisma = makePrisma();
    prisma.evento.findUnique.mockResolvedValue(null);
    const service = new DiasEventoService(prisma as unknown as PrismaService);

    await expect(service.findAll(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejeita data fora do período', async () => {
    const prisma = makePrisma();
    prisma.evento.findUnique.mockResolvedValue(evento);
    const service = new DiasEventoService(prisma as unknown as PrismaService);

    await expect(
      service.create(1, { numeroDia: 1, data: '2026-11-23' }),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it('rejeita número ou data duplicados no evento', async () => {
    const prisma = makePrisma();
    prisma.evento.findUnique.mockResolvedValue(evento);
    prisma.diaEvento.findFirst.mockResolvedValueOnce({ id: 3 });
    const service = new DiasEventoService(prisma as unknown as PrismaService);

    await expect(
      service.create(1, { numeroDia: 1, data: '2026-11-20' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('ordena a listagem por data e número do dia', async () => {
    const prisma = makePrisma();
    prisma.evento.findUnique.mockResolvedValue(evento);
    prisma.diaEvento.findMany.mockResolvedValue([]);
    const service = new DiasEventoService(prisma as unknown as PrismaService);

    await service.findAll(1);
    expect(prisma.diaEvento.findMany).toHaveBeenCalledWith({
      where: { eventoId: 1 },
      orderBy: [{ data: 'asc' }, { numeroDia: 'asc' }],
    });
  });

  it('bloqueia exclusão quando há presença ou desafio associado', async () => {
    const prisma = makePrisma();
    prisma.evento.findUnique.mockResolvedValue(evento);
    prisma.diaEvento.findFirst.mockResolvedValue({ id: 5, eventoId: 1 });
    prisma.$queryRaw.mockResolvedValue([
      { table_name: 'presenca' },
      { table_name: 'desafio' },
    ]);
    prisma.$queryRawUnsafe.mockResolvedValue([{ exists: true }]);
    const service = new DiasEventoService(prisma as unknown as PrismaService);

    await expect(service.remove(1, 5)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.diaEvento.delete).not.toHaveBeenCalled();
  });

  it('falha fechado quando as tabelas oficiais de dependência não existem', async () => {
    const prisma = makePrisma();
    prisma.evento.findUnique.mockResolvedValue(evento);
    prisma.diaEvento.findFirst.mockResolvedValue({ id: 5, eventoId: 1 });
    prisma.$queryRaw.mockResolvedValue([{ table_name: 'presenca' }]);
    const service = new DiasEventoService(prisma as unknown as PrismaService);

    await expect(service.remove(1, 5)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.diaEvento.delete).not.toHaveBeenCalled();
  });
});
