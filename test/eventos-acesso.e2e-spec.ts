import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PasswordHashService } from '../src/modules/auth/password-hash.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Acesso real aos endpoints de eventos (T18 + T15)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: number | undefined;
  let eventoId: number | undefined;
  let token: string;
  const identificador = randomUUID();
  const email = `eventos-${identificador}@example.test`;
  const senha = 'senha-exclusiva-teste-eventos';

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
        nome: 'Administrador de teste T18',
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
  });

  afterAll(async () => {
    try {
      if (eventoId !== undefined) {
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
    ['get', '/eventos'],
    ['post', '/eventos'],
    ['get', '/eventos/ativo'],
    ['get', '/eventos/1'],
    ['patch', '/eventos/1'],
    ['post', '/eventos/1/ativar'],
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

  it('aceita o JWT do login persistido para listar eventos', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/eventos')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  it('permite criar e consultar um evento com o administrador autenticado', async () => {
    const entrada = {
      nome: `T18 Acesso ${identificador}`,
      ano: 2098,
      dataInicio: '2098-05-10',
      dataFim: '2098-05-12',
      quantidadeDias: 3,
    };
    const response = await request(app.getHttpServer())
      .post('/api/v1/eventos')
      .auth(token, { type: 'bearer' })
      .send(entrada)
      .expect(201);
    eventoId = response.body.id;
    expect(response.body).toMatchObject({ ...entrada, ativo: false });
    await request(app.getHttpServer())
      .get(`/api/v1/eventos/${eventoId}`)
      .auth(token, { type: 'bearer' })
      .expect(200, {
        ...entrada,
        id: eventoId,
        ativo: false,
        temResultado: false,
      });
  });
});
