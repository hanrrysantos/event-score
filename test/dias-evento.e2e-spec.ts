import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma/prisma.service.js';

type EventoFixture = { idEvento: number };

describe('DiasEventoController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let dependencyTablesAvailable = false;
  const schemaMode = process.env.US6_E2E_SCHEMA;
  let sequence = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', {
      exclude: [{ path: 'health', method: RequestMethod.GET }],
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);

    const tables = await prisma.$queryRaw<{ table_name: string }[]>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = current_schema()
        AND table_name IN ('presenca', 'desafio')
    `;
    dependencyTablesAvailable = tables.length === 2;

    if (schemaMode !== 'prisma-minimal' && schemaMode !== 'official') {
      throw new Error(
        'US6_E2E_SCHEMA deve ser explicitamente prisma-minimal ou official',
      );
    }
    const expectedDependencyTables = schemaMode === 'official';
    if (dependencyTablesAvailable !== expectedDependencyTables) {
      throw new Error(
        `Schema inesperado para US6_E2E_SCHEMA=${schemaMode}: ` +
          `tabelas de dependência ${dependencyTablesAvailable ? 'presentes' : 'ausentes'}`,
      );
    }
  });

  afterAll(async () => {
    await app.close();
  });

  function date(day: number) {
    return new Date(Date.UTC(2026, 10, day));
  }

  async function event(): Promise<EventoFixture> {
    sequence += 1;
    return prisma.evento.create({
      data: {
        nome: `Evento e2e ${Date.now()}-${sequence}`,
        ano: 2026,
        dataInicio: date(20),
        dataFim: date(23),
        quantidadeDias: 3,
        ativo: false,
      },
      select: { idEvento: true },
    });
  }

  function createDay(eventId: number, numeroDia: number, day: number) {
    return request(app.getHttpServer())
      .post(`/api/v1/eventos/${eventId}/dias`)
      .send({ numeroDia, data: `2026-11-${String(day).padStart(2, '0')}` });
  }

  it('cria, lista em ordem, atualiza e exclui um dia sem dependências', async () => {
    const fixture = await event();
    const first = await createDay(fixture.idEvento, 1, 20).expect(201);
    const second = await createDay(fixture.idEvento, 2, 21).expect(201);

    await request(app.getHttpServer())
      .get(`/api/v1/eventos/${fixture.idEvento}/dias`)
      .expect(200)
      .expect(({ body }) => {
        expect(body.map((item: { id: number }) => item.id)).toEqual([
          first.body.id,
          second.body.id,
        ]);
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/eventos/${fixture.idEvento}/dias/${second.body.id}`)
      .send({ data: '2026-11-22' })
      .expect(200)
      .expect(({ body }) => expect(body.data).toBe('2026-11-22'));

    const deletion = request(app.getHttpServer()).delete(
      `/api/v1/eventos/${fixture.idEvento}/dias/${second.body.id}`,
    );
    if (dependencyTablesAvailable) {
      await deletion.expect(204);
    } else {
      await deletion.expect(503);
    }
  });

  it('retorna 404 para evento inexistente e dia de outro evento', async () => {
    const firstEvent = await event();
    const secondEvent = await event();
    const day = await createDay(firstEvent.idEvento, 1, 20).expect(201);

    await request(app.getHttpServer())
      .get('/api/v1/eventos/999999/dias')
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/v1/eventos/${secondEvent.idEvento}/dias/${day.body.id}`)
      .send({ data: '2026-11-21' })
      .expect(404);
  });

  it('retorna 409 para número e data duplicados no mesmo evento', async () => {
    const fixture = await event();
    await createDay(fixture.idEvento, 1, 20).expect(201);

    await createDay(fixture.idEvento, 1, 21).expect(409);
    await createDay(fixture.idEvento, 2, 20).expect(409);
  });

  it('retorna 400 para data inválida e 422 para regras do evento', async () => {
    const fixture = await event();

    await request(app.getHttpServer())
      .post(`/api/v1/eventos/${fixture.idEvento}/dias`)
      .send({ numeroDia: 1, data: '20/11/2026' })
      .expect(400);

    await createDay(fixture.idEvento, 1, 24).expect(422);
    await createDay(fixture.idEvento, 4, 23).expect(422);
  });

  it('bloqueia exclusão com presença e com desafio, ou falha fechado sem as tabelas', async () => {
    const fixture = await event();
    const presenceDay = await createDay(fixture.idEvento, 1, 20).expect(201);
    const challengeDay = await createDay(fixture.idEvento, 2, 21).expect(201);

    if (!dependencyTablesAvailable) {
      await request(app.getHttpServer())
        .delete(
          `/api/v1/eventos/${fixture.idEvento}/dias/${presenceDay.body.id}`,
        )
        .expect(503)
        .expect(({ body }) => {
          expect(body.message).toBe(
            'Não é possível excluir o dia enquanto o schema não possui as tabelas de dependências oficiais',
          );
          expect(body.message).not.toContain('presenca');
          expect(body.message).not.toContain('desafio');
        });
      return;
    }

    const group = await prisma.$queryRaw<{ id_grupo: number }[]>`
      INSERT INTO grupo (id_evento, nome, cor)
      VALUES (${fixture.idEvento}, ${`Grupo ${Date.now()}`}, ${`cor-${Date.now()}`})
      RETURNING id_grupo
    `;
    const participant = await prisma.$queryRaw<{ id_participante: number }[]>`
      INSERT INTO participante (id_grupo, id_evento, nome, matricula, turma)
      VALUES (${group[0].id_grupo}, ${fixture.idEvento}, 'Participante e2e', ${`mat-${Date.now()}`}, 'T1')
      RETURNING id_participante
    `;
    await prisma.$executeRaw`
      INSERT INTO presenca (id_evento, id_dia, id_participante, presente)
      VALUES (${fixture.idEvento}, ${presenceDay.body.id}, ${participant[0].id_participante}, true)
    `;
    await prisma.$executeRaw`
      INSERT INTO desafio (id_evento, id_dia, nome, descricao)
      VALUES (${fixture.idEvento}, ${challengeDay.body.id}, 'Desafio e2e', 'Dependência de exclusão')
    `;

    await request(app.getHttpServer())
      .delete(`/api/v1/eventos/${fixture.idEvento}/dias/${presenceDay.body.id}`)
      .expect(409);
    await request(app.getHttpServer())
      .delete(
        `/api/v1/eventos/${fixture.idEvento}/dias/${challengeDay.body.id}`,
      )
      .expect(409);
  });
});
