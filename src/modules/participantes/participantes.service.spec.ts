import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ParticipantesService } from './participantes.service.js';

const EVENT_ID = 1;

function csv(rows: string[][]): Buffer {
  const header = 'nome,matricula,turma,grupo';
  const lines = rows.map((row) => row.join(','));
  return Buffer.from([header, ...lines].join('\n'), 'utf-8');
}

describe('ParticipantesService', () => {
  function setup() {
    const prisma = {
      evento: { findUnique: vi.fn() },
      grupo: { findMany: vi.fn() },
      participante: {
        count: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    const service = new ParticipantesService(prisma as never);

    return { service, prisma };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lista participantes com envelope de paginação', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.participante.count.mockResolvedValue(1);
    prisma.participante.findMany.mockResolvedValue([
      {
        id: 1,
        nome: 'João',
        matricula: '123',
        turma: 'A1',
        grupo: { id: 1, nome: 'Alfa' },
      },
    ]);

    const result = await service.list(EVENT_ID, { pagina: 1, tamanho: 20 });

    expect(result.dados).toEqual([
      {
        id: 1,
        nome: 'João',
        matricula: '123',
        turma: 'A1',
        grupoId: 1,
        grupoNome: 'Alfa',
      },
    ]);
    expect(result.paginacao).toEqual({
      pagina: 1,
      tamanho: 20,
      totalItens: 1,
      totalPaginas: 1,
    });
    expect(result.resumo).toEqual({ totalParticipantes: 1 });
  });

  it('retorna 404 ao listar participantes de evento inexistente', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue(null);

    await expect(
      service.list(EVENT_ID, { pagina: 1, tamanho: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('gera prévia com linhas válidas e inválidas', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.grupo.findMany.mockResolvedValue([{ id: 1, nome: 'Alfa' }]);
    prisma.participante.findMany.mockResolvedValue([]);

    const file = csv([
      ['João', '123', 'A1', 'Alfa'],
      ['', '456', 'A2', 'Alfa'],
      ['Maria', '789', 'A3', 'Inexistente'],
      ['Ana', '123', 'A4', 'Alfa'],
    ]);

    const result = await service.previewImport(EVENT_ID, file);

    expect(result.totalLinhas).toBe(4);
    expect(result.validas).toBe(1);
    expect(result.invalidas).toBe(3);
    expect(result.erros).toEqual(
      expect.arrayContaining([
        { linha: 3, problema: 'nome é obrigatório' },
        { linha: 4, problema: "grupo 'Inexistente' não pertence ao evento" },
        { linha: 5, problema: "matricula '123' duplicada no arquivo" },
      ]),
    );
  });

  it('sinaliza matrícula já cadastrada no evento', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.grupo.findMany.mockResolvedValue([{ id: 1, nome: 'Alfa' }]);
    prisma.participante.findMany.mockResolvedValue([{ matricula: '123' }]);

    const result = await service.previewImport(
      EVENT_ID,
      csv([['João', '123', 'A1', 'Alfa']]),
    );

    expect(result.validas).toBe(0);
    expect(result.erros).toEqual([
      { linha: 2, problema: "matricula '123' já cadastrada neste evento" },
    ]);
  });

  it('confirma importação e persiste somente linhas válidas', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.grupo.findMany.mockResolvedValue([{ id: 1, nome: 'Alfa' }]);
    prisma.participante.findMany.mockResolvedValue([]);
    prisma.$transaction.mockResolvedValue([
      {
        id: 10,
        nome: 'João',
        matricula: '123',
        turma: 'A1',
        grupo: { id: 1, nome: 'Alfa' },
      },
    ]);

    const file = csv([
      ['João', '123', 'A1', 'Alfa'],
      ['', '456', 'A2', 'Alfa'],
    ]);

    const result = await service.confirmImport(EVENT_ID, file);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      importados: 1,
      participantes: [
        {
          id: 10,
          nome: 'João',
          matricula: '123',
          turma: 'A1',
          grupoId: 1,
          grupoNome: 'Alfa',
        },
      ],
    });
  });

  it('retorna 400 ao confirmar sem linhas válidas', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.grupo.findMany.mockResolvedValue([]);
    prisma.participante.findMany.mockResolvedValue([]);

    await expect(
      service.confirmImport(EVENT_ID, csv([['', '', '', '']])),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
