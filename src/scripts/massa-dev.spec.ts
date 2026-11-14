import {
  aplicarMassaDev,
  DIAS_DEV,
  EVENTO_DEV,
  fatoresPresenca,
  GRUPOS_DEV,
} from './massa-dev.js';

describe('massa de desenvolvimento', () => {
  it('usa as datas oficiais do evento e dias dentro do período', () => {
    expect(EVENTO_DEV.dataInicio).toBe('2026-11-19');
    expect(EVENTO_DEV.dataFim).toBe('2026-11-20');
    expect(DIAS_DEV).toHaveLength(EVENTO_DEV.quantidadeDias);

    for (const dia of DIAS_DEV) {
      expect(dia.data >= EVENTO_DEV.dataInicio).toBe(true);
      expect(dia.data <= EVENTO_DEV.dataFim).toBe(true);
      expect(dia.numeroDia).toBeLessThanOrEqual(EVENTO_DEV.quantidadeDias);
    }
  });

  it('tem grupos com nome e cor hex únicos', () => {
    const nomes = GRUPOS_DEV.map((g) => g.nome.toLowerCase());
    const cores = GRUPOS_DEV.map((g) => g.cor.toLowerCase());

    expect(new Set(nomes).size).toBe(GRUPOS_DEV.length);
    expect(new Set(cores).size).toBe(GRUPOS_DEV.length);
    for (const cor of cores) {
      expect(cor).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});

describe('fatoresPresenca', () => {
  it('segue o regimento: 0 dia = 0, parcial = 0,5, todos = 1', () => {
    expect(fatoresPresenca(2)).toEqual([
      { diasPresentes: 0, fator: 0 },
      { diasPresentes: 1, fator: 0.5 },
      { diasPresentes: 2, fator: 1 },
    ]);
  });

  it('com um dia só, não há fator parcial', () => {
    expect(fatoresPresenca(1)).toEqual([
      { diasPresentes: 0, fator: 0 },
      { diasPresentes: 1, fator: 1 },
    ]);
  });
});

describe('aplicarMassaDev', () => {
  function prismaFalso(opcoes: {
    eventoExistente?: { id: number; ativo: boolean; quantidadeDias: number };
    outrosAtivos?: number;
  }) {
    const tx = {
      evento: {
        findUnique: vi.fn().mockResolvedValue(opcoes.eventoExistente ?? null),
        count: vi.fn().mockResolvedValue(opcoes.outrosAtivos ?? 0),
        create: vi
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ id: 1, ...data }),
          ),
      },
      diaEvento: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
      grupo: { createMany: vi.fn().mockResolvedValue({ count: 6 }) },
      fatorPresenca: { createMany: vi.fn().mockResolvedValue({ count: 3 }) },
    };
    const prisma = {
      $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    };
    return { prisma, tx };
  }

  it('cria o evento ativo e insere dias, grupos e fatores sem duplicar', async () => {
    const { prisma, tx } = prismaFalso({});

    const resumo = await aplicarMassaDev(prisma as never);

    expect(resumo).toEqual({
      eventoId: 1,
      eventoCriado: true,
      eventoAtivo: true,
      dias: 2,
      grupos: 6,
      fatores: 3,
    });
    expect(tx.evento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        nome: 'Arena Comp 2026',
        dataInicio: new Date('2026-11-19T00:00:00Z'),
        dataFim: new Date('2026-11-20T00:00:00Z'),
        ativo: true,
      }),
    });
    for (const tabela of [tx.diaEvento, tx.grupo, tx.fatorPresenca]) {
      expect(tabela.createMany).toHaveBeenCalledWith(
        expect.objectContaining({ skipDuplicates: true }),
      );
    }
  });

  it('cria o evento inativo se outro evento já estiver ativo', async () => {
    const { prisma, tx } = prismaFalso({ outrosAtivos: 1 });

    const resumo = await aplicarMassaDev(prisma as never);

    expect(resumo.eventoAtivo).toBe(false);
    expect(tx.evento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ ativo: false }),
    });
  });

  it('não recria nem altera o evento que já existe', async () => {
    const { prisma, tx } = prismaFalso({
      eventoExistente: { id: 5, ativo: true, quantidadeDias: 2 },
    });

    const resumo = await aplicarMassaDev(prisma as never);

    expect(resumo).toMatchObject({ eventoId: 5, eventoCriado: false });
    expect(tx.evento.create).not.toHaveBeenCalled();
    expect(tx.diaEvento.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ eventoId: 5, numeroDia: 1 }),
        ]),
      }),
    );
  });
});
