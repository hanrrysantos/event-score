import { randomUUID } from 'node:crypto';
import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { EventosService } from '../src/modules/eventos/eventos.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIXO = `T20 Integração ${randomUUID()}`;

describe('Persistência de eventos (integração)', () => {
  let module: TestingModule;
  let service: EventosService;
  let prisma: PrismaService;
  let eventoAtivoOriginalId: number | undefined;
  let primeiroEventoId: number;
  let segundoEventoId: number;
  const eventoIdsCriados: number[] = [];
  const diaIdsCriados: number[] = [];

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    service = module.get(EventosService);
    prisma = module.get(PrismaService);

    eventoAtivoOriginalId = (
      await prisma.evento.findFirst({ where: { ativo: true } })
    )?.id;
  });

  afterAll(async () => {
    if (diaIdsCriados.length > 0) {
      await prisma.diaEvento.deleteMany({
        where: { id: { in: diaIdsCriados } },
      });
    }

    if (eventoIdsCriados.length > 0) {
      await prisma.evento.deleteMany({
        where: { id: { in: eventoIdsCriados } },
      });
    }

    if (eventoAtivoOriginalId !== undefined) {
      await prisma.evento.updateMany({
        where: { id: eventoAtivoOriginalId },
        data: { ativo: true },
      });
    }

    await module.close();
  });

  it('cria, consulta, lista e atualiza eventos no PostgreSQL', async () => {
    const primeiro = await service.criar({
      nome: `${PREFIXO} A`,
      ano: 2098,
      dataInicio: '2098-05-10',
      dataFim: '2098-05-12',
      quantidadeDias: 3,
    });
    primeiroEventoId = primeiro.id;
    eventoIdsCriados.push(primeiro.id);

    const segundo = await service.criar({
      nome: `${PREFIXO} B`,
      ano: 2099,
      dataInicio: '2099-06-01',
      dataFim: '2099-06-02',
      quantidadeDias: 2,
    });
    segundoEventoId = segundo.id;
    eventoIdsCriados.push(segundo.id);

    expect(primeiro).toMatchObject({
      nome: `${PREFIXO} A`,
      ativo: false,
      dataInicio: '2098-05-10',
      dataFim: '2098-05-12',
    });
    await expect(service.buscarPorId(primeiro.id)).resolves.toEqual({
      ...primeiro,
      temResultado: false,
    });
    await expect(service.obterPeriodoPorId(primeiro.id)).resolves.toEqual({
      eventoId: primeiro.id,
      dataInicio: '2098-05-10',
      dataFim: '2098-05-12',
      quantidadeDias: 3,
    });

    const idsListados = (await service.listar()).map((evento) => evento.id);
    expect(idsListados).toContain(primeiro.id);
    expect(idsListados).toContain(segundo.id);

    await expect(
      service.atualizar(primeiro.id, {
        nome: `${PREFIXO} A Atualizado`,
        dataFim: '2098-05-13',
      }),
    ).resolves.toMatchObject({
      id: primeiro.id,
      nome: `${PREFIXO} A Atualizado`,
      dataFim: '2098-05-13',
      ativo: false,
    });
  });

  it('rejeita alterações que invalidariam dias persistidos', async () => {
    const dia = await prisma.diaEvento.create({
      data: {
        eventoId: primeiroEventoId,
        numeroDia: 3,
        data: new Date('2098-05-12T00:00:00.000Z'),
      },
    });
    diaIdsCriados.push(dia.id);

    await expect(
      service.atualizar(primeiroEventoId, {
        dataFim: '2098-05-11',
        quantidadeDias: 2,
      }),
    ).rejects.toThrow(
      'A alteração deixaria dias já cadastrados fora do período ou da quantidade de dias do evento',
    );
    await expect(
      service.atualizar(primeiroEventoId, { quantidadeDias: 2 }),
    ).rejects.toThrow(
      'A alteração deixaria dias já cadastrados fora do período ou da quantidade de dias do evento',
    );
  });

  it('mantém apenas um evento ativo ao trocar a ativação', async () => {
    await expect(service.ativar(primeiroEventoId)).resolves.toMatchObject({
      id: primeiroEventoId,
      ativo: true,
    });
    await expect(service.ativar(segundoEventoId)).resolves.toMatchObject({
      id: segundoEventoId,
      ativo: true,
    });

    await expect(service.buscarAtivo()).resolves.toMatchObject({
      id: segundoEventoId,
      ativo: true,
    });
    await expect(service.buscarPorId(primeiroEventoId)).resolves.toMatchObject({
      id: primeiroEventoId,
      ativo: false,
    });
    await expect(prisma.evento.count({ where: { ativo: true } })).resolves.toBe(
      1,
    );
  });
});
