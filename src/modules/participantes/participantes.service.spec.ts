import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ParticipantesService } from './participantes.service.js';

const EVENT_ID = 1;

function csvFile(rows: string[][], delimiter = ','): { buffer: Buffer } {
  const header = ['nome', 'matricula', 'turma', 'grupo'].join(delimiter);
  const lines = rows.map((row) => row.join(delimiter));
  return { buffer: Buffer.from([header, ...lines].join('\n'), 'utf-8') };
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

  it('lista participantes com envelope, filtros e campo grupo', async () => {
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

    const result = await service.list(EVENT_ID, {
      pagina: 1,
      tamanho: 20,
      grupoId: 1,
      turma: 'A1',
      busca: 'João',
    });

    expect(prisma.participante.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          eventoId: EVENT_ID,
          grupoId: 1,
          turma: 'A1',
          OR: [
            { nome: { contains: 'João', mode: 'insensitive' } },
            { matricula: { contains: 'João', mode: 'insensitive' } },
          ],
        },
      }),
    );
    expect(result.dados).toEqual([
      {
        id: 1,
        nome: 'João',
        matricula: '123',
        turma: 'A1',
        grupoId: 1,
        grupo: 'Alfa',
      },
    ]);
    expect(result.resumo).toEqual({ totalParticipantes: 1 });
  });

  it('retorna 404 ao listar participantes de evento inexistente', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue(null);

    await expect(
      service.list(EVENT_ID, { pagina: 1, tamanho: 20 }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('gera prévia com todas as linhas, status e motivo de erro', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.grupo.findMany.mockResolvedValue([{ id: 1, nome: 'Alfa' }]);
    prisma.participante.findMany.mockResolvedValue([]);

    const file = csvFile([
      ['João', '123', 'A1', 'Alfa'],
      ['', '456', 'A2', 'Alfa'],
      ['Maria', '789', 'A3', 'Inexistente'],
      ['Ana', '123', 'A4', 'Alfa'],
    ]);

    const result = await service.previewImport(EVENT_ID, file);

    expect(result.totalLinhas).toBe(4);
    expect(result.linhasValidas).toBe(1);
    expect(result.linhasComErro).toBe(3);
    expect(result.linhas).toEqual([
      {
        linha: 2,
        nome: 'João',
        matricula: '123',
        turma: 'A1',
        grupo: 'Alfa',
        status: 'VALIDO',
        motivoErro: null,
      },
      {
        linha: 3,
        nome: '',
        matricula: '456',
        turma: 'A2',
        grupo: 'Alfa',
        status: 'ERRO',
        motivoErro: 'nome é obrigatório',
      },
      {
        linha: 4,
        nome: 'Maria',
        matricula: '789',
        turma: 'A3',
        grupo: 'Inexistente',
        status: 'ERRO',
        motivoErro: "grupo 'Inexistente' não pertence ao evento",
      },
      {
        linha: 5,
        nome: 'Ana',
        matricula: '123',
        turma: 'A4',
        grupo: 'Alfa',
        status: 'ERRO',
        motivoErro: "matricula '123' duplicada no arquivo",
      },
    ]);
  });

  it('aceita CSV com ponto e vírgula e aponta linha em branco', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.grupo.findMany.mockResolvedValue([{ id: 1, nome: 'Alfa' }]);
    prisma.participante.findMany.mockResolvedValue([]);

    const file = csvFile(
      [['João', '123', 'A1', 'Alfa'], [], ['Maria', '456', 'A2', 'Alfa']],
      ';',
    );

    const result = await service.previewImport(EVENT_ID, file);

    expect(result.linhasValidas).toBe(2);
    expect(result.linhasComErro).toBe(1);
    expect(result.linhas[1]).toEqual({
      linha: 3,
      nome: '',
      matricula: '',
      turma: '',
      grupo: '',
      status: 'ERRO',
      motivoErro: 'linha em branco',
    });
  });

  it('sinaliza matrícula já cadastrada no evento', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.grupo.findMany.mockResolvedValue([{ id: 1, nome: 'Alfa' }]);
    prisma.participante.findMany.mockResolvedValue([{ matricula: '123' }]);

    const result = await service.previewImport(
      EVENT_ID,
      csvFile([['João', '123', 'A1', 'Alfa']]),
    );

    expect(result.linhasComErro).toBe(1);
    expect(result.linhas[0].motivoErro).toBe(
      "matricula '123' já cadastrada neste evento",
    );
  });

  it('confirma importação sem erros e persiste todas as linhas', async () => {
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

    const result = await service.confirmImport(
      EVENT_ID,
      csvFile([['João', '123', 'A1', 'Alfa']]),
    );

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
          grupo: 'Alfa',
        },
      ],
    });
  });

  it('recusa confirmação com erro (422) e não grava nada', async () => {
    const { service, prisma } = setup();
    prisma.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prisma.grupo.findMany.mockResolvedValue([]);
    prisma.participante.findMany.mockResolvedValue([]);

    const promise = service.confirmImport(
      EVENT_ID,
      csvFile([
        ['João', '123', 'A1', 'Alfa'],
        ['', '', '', ''],
      ]),
    );

    await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
