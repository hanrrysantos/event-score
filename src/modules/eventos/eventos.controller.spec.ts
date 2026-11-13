import {
  type INestApplication,
  NotFoundException,
  UnprocessableEntityException,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { HttpExceptionFilter } from '../../common/filters/http-exception.filter.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuthUserRepository } from '../auth/auth-user.repository.js';
import { EventosModule } from './eventos.module.js';
import { EventosService } from './eventos.service.js';

const entrada = {
  nome: 'Arena Comp 2026',
  ano: 2026,
  dataInicio: '2026-11-20',
  dataFim: '2026-11-22',
  quantidadeDias: 3,
};
const evento = { ...entrada, id: 1, ativo: false };
const detalhe = { ...evento, temResultado: false };
const rotas = [
  ['get', '/eventos'],
  ['post', '/eventos'],
  ['get', '/eventos/ativo'],
  ['get', '/eventos/1'],
  ['patch', '/eventos/1'],
  ['post', '/eventos/1/ativar'],
] as const;

describe('EventosController (HTTP com dependências simuladas)', () => {
  let app: INestApplication<App>;
  let token: string;
  const eventos = {
    listar: vi.fn(),
    criar: vi.fn(),
    buscarAtivo: vi.fn(),
    buscarPorId: vi.fn(),
    atualizar: vi.fn(),
    ativar: vi.fn(),
  };
  const admin = {
    id: 7,
    nome: 'Administradora',
    email: 'admin@example.com',
    senhaHash: 'hash-simulado',
    perfil: 'ADMIN',
    ativo: true,
  };
  const users = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              JWT_SECRET: 't18-test-only-secret-at-least-32-characters',
            }),
          ],
        }),
        AuthModule.register({ provide: AuthUserRepository, useValue: users }),
        PrismaModule,
        EventosModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(EventosService)
      .useValue(eventos)
      .compile();

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
    token = await app.get(JwtService).signAsync({ sub: admin.id });
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    vi.resetAllMocks();
    users.findById.mockResolvedValue(admin);
    eventos.listar.mockResolvedValue([evento]);
    eventos.criar.mockResolvedValue(evento);
    eventos.buscarAtivo.mockResolvedValue({ ...evento, ativo: true });
    eventos.buscarPorId.mockResolvedValue(detalhe);
    eventos.atualizar.mockResolvedValue({ ...evento, nome: 'Nova edição' });
    eventos.ativar.mockResolvedValue({ ...evento, ativo: true });
  });

  it('lista eventos como array, inclusive quando não há registros', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/eventos')
      .auth(token, { type: 'bearer' })
      .expect(200, [evento]);
    eventos.listar.mockResolvedValueOnce([]);
    await request(app.getHttpServer())
      .get('/api/v1/eventos')
      .auth(token, { type: 'bearer' })
      .expect(200, []);
  });

  it('cria um evento com HTTP 201 e encaminha o DTO ao service', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/eventos')
      .auth(token, { type: 'bearer' })
      .send(entrada)
      .expect(201, evento);
    expect(eventos.criar).toHaveBeenCalledExactlyOnceWith(entrada);
  });

  it('resolve /ativo antes da rota parametrizada e devolve o resumo', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/eventos/ativo')
      .auth(token, { type: 'bearer' })
      .expect(200, { ...evento, ativo: true });
    expect(eventos.buscarAtivo).toHaveBeenCalledOnce();
    expect(eventos.buscarPorId).not.toHaveBeenCalled();
  });

  it('consulta o detalhe incluindo temResultado e converte o ID em número', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/eventos/1')
      .auth(token, { type: 'bearer' })
      .expect(200, detalhe);
    expect(eventos.buscarPorId).toHaveBeenCalledExactlyOnceWith(1);
  });

  it('encaminha a atualização parcial sem acrescentar campos ausentes', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/eventos/1')
      .auth(token, { type: 'bearer' })
      .send({ nome: 'Nova edição' })
      .expect(200, { ...evento, nome: 'Nova edição' });
    expect(eventos.atualizar).toHaveBeenCalledExactlyOnceWith(1, {
      nome: 'Nova edição',
    });
  });

  it('ativa o evento com HTTP 200', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/eventos/1/ativar')
      .auth(token, { type: 'bearer' })
      .expect(200, { ...evento, ativo: true });
    expect(eventos.ativar).toHaveBeenCalledExactlyOnceWith(1);
  });

  it.each([
    {},
    { ...entrada, ano: '2026' },
    { ...entrada, quantidadeDias: 1.5 },
    { ...entrada, dataInicio: '2026-02-30' },
    { ...entrada, ativo: true },
    { ...entrada, id: 3 },
  ])('rejeita criação inválida sem chamar o service: %o', async (body) => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/eventos')
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(400);
    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
    });
    expect(Array.isArray(response.body.message)).toBe(true);
    expect(eventos.criar).not.toHaveBeenCalled();
  });

  it.each([
    { nome: null },
    { ano: null },
    { dataInicio: null },
    { dataFim: null },
    { quantidadeDias: null },
    { ativo: true },
    { temResultado: true },
  ])('rejeita null e campos indevidos no PATCH: %o', async (body) => {
    await request(app.getHttpServer())
      .patch('/api/v1/eventos/1')
      .auth(token, { type: 'bearer' })
      .send(body)
      .expect(400);
    expect(eventos.atualizar).not.toHaveBeenCalled();
  });

  it.each(['abc', '0', '-1', '1.5', '1e2', '2147483648', '9007199254740993'])(
    'rejeita o ID inválido %s em todas as rotas parametrizadas',
    async (id) => {
      for (const [method, path] of [
        ['get', `/eventos/${id}`],
        ['patch', `/eventos/${id}`],
        ['post', `/eventos/${id}/ativar`],
      ] as const) {
        const response = await request(app.getHttpServer())
          [method](`/api/v1${path}`)
          .auth(token, { type: 'bearer' })
          .send({})
          .expect(400);
        expect(response.body).toMatchObject({
          statusCode: 400,
          error: 'Bad Request',
        });
      }
      expect(eventos.buscarPorId).not.toHaveBeenCalled();
      expect(eventos.atualizar).not.toHaveBeenCalled();
      expect(eventos.ativar).not.toHaveBeenCalled();
    },
  );

  it.each(rotas)(
    'exige JWT na rota %s %s com o guard oficial integrado',
    async (method, path) => {
      for (const authorization of [undefined, 'Bearer token-invalido']) {
        const chamada = request(app.getHttpServer())[method](`/api/v1${path}`);
        if (authorization) chamada.set('Authorization', authorization);
        const response = await chamada.send(entrada).expect(401);
        expect(response.body).toEqual({
          statusCode: 401,
          message: 'Token ausente ou inválido',
          error: 'Unauthorized',
        });
      }
      for (const operacao of Object.values(eventos)) {
        expect(operacao).not.toHaveBeenCalled();
      }
    },
  );

  it('preserva o envelope 404 do service', async () => {
    eventos.buscarPorId.mockRejectedValueOnce(
      new NotFoundException('Evento não encontrado'),
    );
    await request(app.getHttpServer())
      .get('/api/v1/eventos/404')
      .auth(token, { type: 'bearer' })
      .expect(404, {
        statusCode: 404,
        message: 'Evento não encontrado',
        error: 'Not Found',
      });
  });

  it('preserva o envelope 422 do service', async () => {
    const message = 'A quantidade de dias não pode exceder o período do evento';
    eventos.criar.mockRejectedValueOnce(
      new UnprocessableEntityException(message),
    );
    await request(app.getHttpServer())
      .post('/api/v1/eventos')
      .auth(token, { type: 'bearer' })
      .send(entrada)
      .expect(422, { statusCode: 422, message, error: 'Unprocessable Entity' });
  });
});
