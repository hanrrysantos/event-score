import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PasswordHashService } from '../src/modules/auth/password-hash.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Acesso aos endpoints de grupos (T23 + T15)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: number | undefined;
  let eventoId: number | undefined;
  let token: string;
  const identificador = randomUUID();
  const email = `grupos-${identificador}@example.test`;
  const senha = 'senha-exclusiva-teste-grupos';

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
        transformOptions: { enableImplicitConversion: false },
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
    prisma = app.get(PrismaService);

    const admin = await prisma.usuario.create({
      data: {
        nome: 'Administrador de teste grupos',
        email,
        senhaHash: await app.get(PasswordHashService).hash(senha),
        perfil: 'ADMIN',
        ativo: true,
      },
    });
    adminId = admin.id;

    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, senha })
      .expect(200);
    token = response.body.token;

    const evento = await prisma.evento.create({
      data: {
        nome: `Evento grupos ${identificador}`,
        ano: 2098,
        dataInicio: new Date('2098-05-10T00:00:00.000Z'),
        dataFim: new Date('2098-05-12T00:00:00.000Z'),
        quantidadeDias: 3,
      },
    });
    eventoId = evento.id;
  });

  afterAll(async () => {
    try {
      if (eventoId !== undefined) {
        await prisma.participante.deleteMany({ where: { eventoId } });
        await prisma.grupo.deleteMany({ where: { eventoId } });
        await prisma.evento.deleteMany({ where: { id: eventoId } });
      }
      if (adminId !== undefined) {
        await prisma.usuario.deleteMany({ where: { id: adminId } });
      }
    } finally {
      await app?.close();
    }
  });

  it.each([
    ['get', '/eventos/1/grupos'],
    ['post', '/eventos/1/grupos'],
    ['get', '/eventos/1/grupos/1'],
    ['patch', '/eventos/1/grupos/1'],
    ['delete', '/eventos/1/grupos/1'],
  ] as const)('protege %s %s na aplicação principal', async (method, path) => {
    for (const authorization of [undefined, 'Bearer token-invalido']) {
      const chamada = request(app.getHttpServer())[method](`/api/v1${path}`);
      if (authorization) chamada.set('Authorization', authorization);
      await chamada.expect(401, {
        statusCode: 401,
        message: 'Token ausente ou inválido',
        error: 'Unauthorized',
      });
    }
  });

  it('executa o fluxo completo de grupos com o administrador autenticado', async () => {
    const criar = await request(app.getHttpServer())
      .post(`/api/v1/eventos/${eventoId}/grupos`)
      .auth(token, { type: 'bearer' })
      .send({ nome: 'Alfa', cor: '#FF5733' })
      .expect(201);
    const grupoId = criar.body.id;
    expect(criar.body).toMatchObject({
      nome: 'Alfa',
      cor: '#FF5733',
      quantidadeParticipantes: 0,
    });

    await request(app.getHttpServer())
      .get(`/api/v1/eventos/${eventoId}/grupos`)
      .auth(token, { type: 'bearer' })
      .expect(200)
      .expect(({ body }) => {
        expect(Array.isArray(body)).toBe(true);
        expect(body.map((grupo: { id: number }) => grupo.id)).toContain(
          grupoId,
        );
      });

    await request(app.getHttpServer())
      .get(`/api/v1/eventos/${eventoId}/grupos/${grupoId}`)
      .auth(token, { type: 'bearer' })
      .expect(200, {
        id: grupoId,
        nome: 'Alfa',
        cor: '#FF5733',
        quantidadeParticipantes: 0,
      });

    await request(app.getHttpServer())
      .patch(`/api/v1/eventos/${eventoId}/grupos/${grupoId}`)
      .auth(token, { type: 'bearer' })
      .send({ nome: 'Alfa Prime' })
      .expect(200)
      .expect(({ body }) => {
        expect(body.nome).toBe('Alfa Prime');
      });

    await request(app.getHttpServer())
      .delete(`/api/v1/eventos/${eventoId}/grupos/${grupoId}`)
      .auth(token, { type: 'bearer' })
      .expect(204);
  });

  it('retorna 400 para payload inválido e identificador não numérico', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/eventos/${eventoId}/grupos`)
      .auth(token, { type: 'bearer' })
      .send({ nome: '', cor: 'vermelho' })
      .expect(400);

    await request(app.getHttpServer())
      .get(`/api/v1/eventos/${eventoId}/grupos/abc`)
      .auth(token, { type: 'bearer' })
      .expect(400);
  });

  it('retorna 404 para evento inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/eventos/999999999/grupos')
      .auth(token, { type: 'bearer' })
      .expect(404);
  });

  it('retorna 409 ao criar grupo com nome duplicado', async () => {
    const payload = { nome: `Duplicado ${identificador}`, cor: '#FF5733' };
    await request(app.getHttpServer())
      .post(`/api/v1/eventos/${eventoId}/grupos`)
      .auth(token, { type: 'bearer' })
      .send(payload)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/eventos/${eventoId}/grupos`)
      .auth(token, { type: 'bearer' })
      .send(payload)
      .expect(409);
  });
});
