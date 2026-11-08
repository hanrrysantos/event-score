import { Test, type TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';
import { EventosService } from '../src/modules/eventos/eventos.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

const PREFIXO = 'T20 Integração';

describe('Persistência de eventos (integração)', () => {
  let module: TestingModule;
  let service: EventosService;
  let prisma: PrismaService;
  let eventoAtivoOriginalId: number | undefined;
  let primeiroEventoId: number;
  let segundoEventoId: number;

  beforeAll(async () => {
    module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    service = module.get(EventosService);
    prisma = module.get(PrismaService);

    await prisma.evento.deleteMany({
      where: { nome: { startsWith: PREFIXO } },
    });
    eventoAtivoOriginalId = (
      await prisma.evento.findFirst({ where: { ativo: true } })
    )?.id;
  });

  afterAll(async () => {
    await prisma.evento.deleteMany({
      where: { nome: { startsWith: PREFIXO } },
    });

    if (eventoAtivoOriginalId !== undefined) {
      await prisma.evento.update({
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
    const segundo = await service.criar({
      nome: `${PREFIXO} B`,
      ano: 2099,
      dataInicio: '2099-06-01',
      dataFim: '2099-06-02',
      quantidadeDias: 2,
    });
    primeiroEventoId = primeiro.id;
    segundoEventoId = segundo.id;

    expect(primeiro).toMatchObject({
      nome: `${PREFIXO} A`,
      ativo: false,
      dataInicio: '2098-05-10',
      dataFim: '2098-05-12',
    });
    await expect(service.buscarPorId(primeiro.id)).resolves.toEqual(primeiro);
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
