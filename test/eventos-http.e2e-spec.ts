import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PasswordHashService } from '../src/modules/auth/password-hash.service.js';
import type { EventoCadastrado } from '../src/modules/eventos/eventos.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Eventos HTTP com PostgreSQL e login real (T19)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: number | undefined;
  let ativoOriginalId: number | undefined;
  let token: string;
  const eventoIds: number[] = [];
  const email = `t19-${randomUUID()}@example.test`;
  const senha = 'senha-exclusiva-integracao-t19';
  const periodo = {
    ano: 2098,
    dataInicio: '2098-05-10',
    dataFim: '2098-05-12',
    quantidadeDias: 3,
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: false,
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);
    ativoOriginalId = (
      await prisma.evento.findFirst({ where: { ativo: true } })
    )?.id;
    const admin = await prisma.usuario.create({
      data: {
        nome: 'Administrador T19',
        email,
        perfil: 'ADMIN',
        ativo: true,
        senhaHash: await app.get(PasswordHashService).hash(senha),
      },
    });
    adminId = admin.id;
    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, senha })
      .expect(200);
    token = login.body.token;
  });

  afterAll(async () => {
    try {
      if (prisma && eventoIds.length > 0) {
        const where = { eventoId: { in: eventoIds } };
        await prisma.$transaction([
          prisma.resultadoDesafio.deleteMany({ where }),
          prisma.apuracao.deleteMany({ where }),
          prisma.desafio.deleteMany({ where }),
          prisma.grupo.deleteMany({ where }),
          prisma.diaEvento.deleteMany({ where }),
          prisma.evento.deleteMany({ where: { id: { in: eventoIds } } }),
        ]);
      }
      if (ativoOriginalId !== undefined) {
        await prisma.evento.update({
          where: { id: ativoOriginalId },
          data: { ativo: true },
        });
      }
      if (adminId !== undefined) {
        await prisma.usuario.deleteMany({ where: { id: adminId } });
      }
    } finally {
      await app?.close();
    }
  });

  async function criarEvento(
    alteracoes: Record<string, unknown> = {},
  ): Promise<EventoCadastrado> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/eventos')
      .auth(token, { type: 'bearer' })
      .send({ ...periodo, nome: `T19 ${randomUUID()}`, ...alteracoes });
    if (typeof response.body.id === 'number') eventoIds.push(response.body.id);
    expect(response.status).toBe(201);
    return response.body as EventoCadastrado;
  }

  function chamada(method: 'get' | 'post' | 'patch', path: string) {
    return request(app.getHttpServer())
      [method](`/api/v1/eventos${path}`)
      .auth(token, { type: 'bearer' });
  }

  it('normaliza, persiste e lista eventos em ordem determinística', async () => {
    const nome = `T19 ${randomUUID()}`;
    const primeiro = await criarEvento({ nome: `  ${nome}  ` });
    const segundo = await criarEvento({ ano: 2099 });
    expect(primeiro).toEqual({
      ...periodo,
      nome,
      id: primeiro.id,
      ativo: false,
    });
    const registro = await prisma.evento.findUniqueOrThrow({
      where: { id: primeiro.id },
    });
    expect(registro.dataInicio.toISOString()).toBe('2098-05-10T00:00:00.000Z');
    expect(registro.nome).toBe(nome);
    const response = await chamada('get', '').expect(200);
    const eventos = response.body as EventoCadastrado[];
    expect(eventos).toContainEqual(primeiro);
    expect(eventos.findIndex((e) => e.id === segundo.id)).toBeLessThan(
      eventos.findIndex((e) => e.id === primeiro.id),
    );
  });

  it('preserva campos ausentes no PATCH, identidade e estado ativo', async () => {
    const evento = await criarEvento();
    await chamada('post', `/${evento.id}/ativar`).expect(200);
    await chamada('patch', `/${evento.id}`)
      .send({ dataFim: '2098-05-13' })
      .expect(200, { ...evento, dataFim: '2098-05-13', ativo: true });
    await chamada('get', `/${evento.id}`).expect(200, {
      ...evento,
      dataFim: '2098-05-13',
      ativo: true,
      temResultado: false,
    });
  });

  it('traduz unicidade real em 409 na criação e na edição, sem alterar o destino', async () => {
    const primeiro = await criarEvento();
    const segundo = await criarEvento();
    const erro = {
      statusCode: 409,
      message: 'Já existe um registro com os dados informados',
      error: 'Conflict',
    };
    await chamada('post', '')
      .send({ ...periodo, nome: primeiro.nome })
      .expect(409, erro);
    await chamada('patch', `/${segundo.id}`)
      .send({ nome: primeiro.nome })
      .expect(409, erro);
    await chamada('get', `/${segundo.id}`).expect(200, {
      ...segundo,
      temResultado: false,
    });
  });

  it.each(['nome', 'ano', 'dataInicio', 'dataFim', 'quantidadeDias'])(
    'rejeita null em %s e mantém o registro persistido',
    async (campo) => {
      const evento = await criarEvento();
      const response = await chamada('patch', `/${evento.id}`)
        .send({ [campo]: null })
        .expect(400);
      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
      expect(Array.isArray(response.body.message)).toBe(true);
      await chamada('get', `/${evento.id}`).expect(200, {
        ...evento,
        temResultado: false,
      });
    },
  );

  it('rejeita tipos e campos indevidos antes de persistir', async () => {
    const evento = await criarEvento();
    await chamada('patch', `/${evento.id}`)
      .send({ ativo: true, temResultado: true })
      .expect(400);
    await chamada('post', '')
      .send({ ...periodo, nome: `T19 ${randomUUID()}`, ano: '2098' })
      .expect(400);
    await chamada('get', `/${evento.id}`).expect(200, {
      ...evento,
      temResultado: false,
    });
  });

  it.each([{ dataFim: '2098-05-09' }, { quantidadeDias: 4 }])(
    'retorna 422 por incoerência do período: %o',
    async (alteracoes) => {
      const response = await chamada('post', '')
        .send({ ...periodo, nome: `T19 ${randomUUID()}`, ...alteracoes })
        .expect(422);
      expect(response.body).toMatchObject({
        statusCode: 422,
        error: 'Unprocessable Entity',
      });
    },
  );

  it('revalida o período completo em uma atualização parcial', async () => {
    const evento = await criarEvento();
    await chamada('patch', `/${evento.id}`)
      .send({ dataInicio: '2098-05-13' })
      .expect(422);
    await chamada('get', `/${evento.id}`).expect(200, {
      ...evento,
      temResultado: false,
    });
  });

  it('preserva dias cadastrados e aceita ampliar o período', async () => {
    const evento = await criarEvento();
    await prisma.diaEvento.createMany({
      data: [
        {
          eventoId: evento.id,
          numeroDia: 1,
          data: new Date('2098-05-10T00:00:00Z'),
        },
        {
          eventoId: evento.id,
          numeroDia: 3,
          data: new Date('2098-05-12T00:00:00Z'),
        },
      ],
    });
    for (const body of [
      { dataInicio: '2098-05-11', quantidadeDias: 2 },
      { dataFim: '2098-05-11', quantidadeDias: 2 },
      { quantidadeDias: 2 },
    ]) {
      await chamada('patch', `/${evento.id}`).send(body).expect(422);
    }
    await chamada('get', `/${evento.id}`).expect(200, {
      ...evento,
      temResultado: false,
    });
    await chamada('patch', `/${evento.id}`)
      .send({ dataFim: '2098-05-13' })
      .expect(200);
    expect(
      await prisma.diaEvento.count({ where: { eventoId: evento.id } }),
    ).toBe(2);
  });

  it('troca o evento ativo por HTTP e mantém a ativação idempotente', async () => {
    const primeiro = await criarEvento();
    const segundo = await criarEvento();
    await chamada('post', `/${primeiro.id}/ativar`).expect(200, {
      ...primeiro,
      ativo: true,
    });
    for (let i = 0; i < 2; i++) {
      await chamada('post', `/${segundo.id}/ativar`).expect(200, {
        ...segundo,
        ativo: true,
      });
    }
    await chamada('get', '/ativo').expect(200, { ...segundo, ativo: true });
    expect(await prisma.evento.count({ where: { ativo: true } })).toBe(1);
    expect(
      (await prisma.evento.findUniqueOrThrow({ where: { id: primeiro.id } }))
        .ativo,
    ).toBe(false);
  });

  it('retorna 404 para IDs inexistentes sem desativar o evento atual', async () => {
    const ativo = await criarEvento();
    const removido = await criarEvento();
    await prisma.evento.delete({ where: { id: removido.id } });
    await chamada('post', `/${ativo.id}/ativar`).expect(200);
    for (const [method, path] of [
      ['get', `/${removido.id}`],
      ['patch', `/${removido.id}`],
      ['post', `/${removido.id}/ativar`],
    ] as const) {
      await chamada(method, path).send({ nome: 'Ausente' }).expect(404, {
        statusCode: 404,
        message: 'Evento não encontrado',
        error: 'Not Found',
      });
    }
    await chamada('get', '/ativo').expect(200, { ...ativo, ativo: true });
  });

  it('retorna 404 quando nenhum evento está ativo', async () => {
    const evento = await criarEvento();
    await chamada('post', `/${evento.id}/ativar`).expect(200);
    await prisma.evento.update({
      where: { id: evento.id },
      data: { ativo: false },
    });
    await chamada('get', '/ativo').expect(404, {
      statusCode: 404,
      message: 'Nenhum evento está ativo no momento',
      error: 'Not Found',
    });
  });

  it('calcula temResultado com resultado ou apuração e isola eventos', async () => {
    const comResultado = await criarEvento();
    const comApuracao = await criarEvento();
    const semResultado = await criarEvento();
    const dia = await prisma.diaEvento.create({
      data: {
        eventoId: comResultado.id,
        numeroDia: 1,
        data: new Date('2098-05-10T00:00:00Z'),
      },
    });
    const grupo = await prisma.grupo.create({
      data: { eventoId: comResultado.id, nome: 'Grupo T19', cor: '#112233' },
    });
    const desafio = await prisma.desafio.create({
      data: { eventoId: comResultado.id, diaId: dia.id, nome: 'Desafio T19' },
    });
    await prisma.resultadoDesafio.create({
      data: {
        eventoId: comResultado.id,
        desafioId: desafio.id,
        grupoId: grupo.id,
        colocacao: 1,
      },
    });
    await prisma.apuracao.create({
      data: {
        eventoId: comApuracao.id,
        usuarioId: adminId!,
        versao: 1,
        operacaoId: randomUUID(),
      },
    });
    for (const evento of [comResultado, comApuracao]) {
      await chamada('get', `/${evento.id}`).expect(200, {
        ...evento,
        temResultado: true,
      });
    }
    await chamada('get', `/${semResultado.id}`).expect(200, {
      ...semResultado,
      temResultado: false,
    });
  });

  it('recusa JWT expirado e revoga o acesso quando o administrador é desativado', async () => {
    const expirado = await app
      .get(JwtService)
      .signAsync({ sub: adminId }, { expiresIn: -1 });
    await request(app.getHttpServer())
      .get('/api/v1/eventos')
      .auth(expirado, { type: 'bearer' })
      .expect(401);
    await prisma.usuario.update({
      where: { id: adminId! },
      data: { ativo: false },
    });
    try {
      await chamada('post', '')
        .send({ ...periodo, nome: `T19 ${randomUUID()}` })
        .expect(401);
    } finally {
      await prisma.usuario.update({
        where: { id: adminId! },
        data: { ativo: true },
      });
    }
  });
});
