import { ConflictException, NotFoundException } from '@nestjs/common';
import { GruposService } from './grupos.service.js';

describe('GruposService', () => {
  const EVENT_ID = 1;
  const GROUP_ID = 7;

  const summary = {
    id: GROUP_ID,
    nome: 'Alfa',
    cor: '#FF5733',
    quantidadeParticipantes: 2,
  };

  const groupWithCount = {
    id: GROUP_ID,
    nome: 'Alfa',
    cor: '#FF5733',
    _count: { participantes: 2 },
  };

  function setup() {
    const prisma = {
      evento: { findUnique: vi.fn() },
      grupo: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      participante: { count: vi.fn() },
    };
    const service = new GruposService(prisma as never);

    return { service, prisma };
  }

  it('lista os grupos de um evento existente como resumo', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.grupo.findMany.mockResolvedValue([groupWithCount]);

    const result = await service.list(EVENT_ID);

    expect(prisma.grupo.findMany).toHaveBeenCalledWith({
      where: { eventoId: EVENT_ID },
      orderBy: { id: 'asc' },
      include: { _count: { select: { participantes: true } } },
    });
    expect(result).toEqual([summary]);
  });

  it('retorna 404 ao listar grupos de um evento inexistente', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue(null);

    await expect(service.list(EVENT_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.grupo.findMany).not.toHaveBeenCalled();
  });

  it('retorna o resumo quando o grupo pertence ao evento', async () => {
    const { service, prisma } = setup();
    prisma.grupo.findUnique.mockResolvedValue(groupWithCount);

    const result = await service.findById(EVENT_ID, GROUP_ID);

    expect(prisma.grupo.findUnique).toHaveBeenCalledWith({
      where: { id_eventoId: { id: GROUP_ID, eventoId: EVENT_ID } },
      include: { _count: { select: { participantes: true } } },
    });
    expect(result).toEqual(summary);
  });

  it('retorna 404 quando o grupo não pertence ao evento', async () => {
    const { service, prisma } = setup();
    prisma.grupo.findUnique.mockResolvedValue(null);
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });

    await expect(service.findById(EVENT_ID, GROUP_ID)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('cria um grupo em um evento existente e retorna o resumo', async () => {
    const { service, prisma } = setup();
    const dto = { nome: 'Alfa', cor: '#FF5733' };
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.grupo.create.mockResolvedValue({
      ...groupWithCount,
      _count: { participantes: 0 },
    });

    const result = await service.create(EVENT_ID, dto);

    expect(prisma.grupo.create).toHaveBeenCalledWith({
      data: { eventoId: EVENT_ID, nome: dto.nome, cor: dto.cor },
      include: { _count: { select: { participantes: true } } },
    });
    expect(result).toEqual({ ...summary, quantidadeParticipantes: 0 });
  });

  it('atualiza um grupo que pertence ao evento', async () => {
    const { service, prisma } = setup();
    const dto = { nome: 'Alfa Prime' };
    prisma.grupo.findUnique.mockResolvedValue({ id: GROUP_ID });
    prisma.grupo.update.mockResolvedValue({
      ...groupWithCount,
      nome: 'Alfa Prime',
    });

    const result = await service.update(EVENT_ID, GROUP_ID, dto);

    expect(prisma.grupo.update).toHaveBeenCalledWith({
      where: { id_eventoId: { id: GROUP_ID, eventoId: EVENT_ID } },
      data: dto,
      include: { _count: { select: { participantes: true } } },
    });
    expect(result).toEqual({ ...summary, nome: 'Alfa Prime' });
  });

  it('recusa excluir grupo com participantes vinculados (409)', async () => {
    const { service, prisma } = setup();
    prisma.grupo.findUnique.mockResolvedValue({ id: GROUP_ID });
    prisma.participante.count.mockResolvedValue(2);

    await expect(service.remove(EVENT_ID, GROUP_ID)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.grupo.delete).not.toHaveBeenCalled();
  });

  it('exclui um grupo sem participantes', async () => {
    const { service, prisma } = setup();
    prisma.grupo.findUnique.mockResolvedValue({ id: GROUP_ID });
    prisma.participante.count.mockResolvedValue(0);
    prisma.grupo.delete.mockResolvedValue({ id: GROUP_ID });

    await service.remove(EVENT_ID, GROUP_ID);

    expect(prisma.grupo.delete).toHaveBeenCalledWith({
      where: { id_eventoId: { id: GROUP_ID, eventoId: EVENT_ID } },
    });
  });
});
