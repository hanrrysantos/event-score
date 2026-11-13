import { randomUUID } from 'node:crypto';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter.js';
import { PasswordHashService } from '../src/modules/auth/password-hash.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

function csv(rows: string[][]): string {
  const header = 'nome,matricula,turma,grupo';
  const lines = rows.map((row) => row.join(','));
  return [header, ...lines].join('\n');
}

describe('Acesso aos endpoints de participantes (#203 + T15)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminId: number | undefined;
  let eventoId: number | undefined;
  let token: string;
  const identificador = randomUUID();
  const email = `participantes-${identificador}@example.test`;
  const senha = 'senha-exclusiva-teste-participantes';

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
        nome: 'Administrador de teste participantes',
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
        nome: `Evento participantes ${identificador}`,
        ano: 2098,
        dataInicio: new Date('2098-05-10T00:00:00.000Z'),
        dataFim: new Date('2098-05-12T00:00:00.000Z'),
        quantidadeDias: 3,
      },
    });
    eventoId = evento.id;

    await prisma.grupo.create({
      data: { eventoId, nome: 'Alfa', cor: '#FF5733' },
    });
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
    ['get', '/eventos/1/participantes'],
    ['post', '/eventos/1/participantes/importacao'],
    ['post', '/eventos/1/participantes/importacao/confirmar'],
  ] as const)('protege %s %s na aplicação principal', async (method, path) => {
    const chamada = request(app.getHttpServer())[method](`/api/v1${path}`);
    await chamada.expect(401, {
      statusCode: 401,
      message: 'Token ausente ou inválido',
      error: 'Unauthorized',
    });
  });

  it('importa participantes via multipart e lista com envelope', async () => {
    const arquivo = Buffer.from(
      csv([
        ['João', '2023001', 'A1', 'Alfa'],
        ['Maria', '2023002', 'A2', 'Alfa'],
      ]),
      'utf-8',
    );

    const preview = await request(app.getHttpServer())
      .post(`/api/v1/eventos/${eventoId}/participantes/importacao`)
      .auth(token, { type: 'bearer' })
      .attach('arquivo', arquivo, 'participantes.csv')
      .expect(200);
    expect(preview.body).toEqual({
      totalLinhas: 2,
      validas: 2,
      invalidas: 0,
      erros: [],
    });

    const confirm = await request(app.getHttpServer())
      .post(`/api/v1/eventos/${eventoId}/participantes/importacao/confirmar`)
      .auth(token, { type: 'bearer' })
      .attach('arquivo', arquivo, 'participantes.csv')
      .expect(201);
    expect(confirm.body.importados).toBe(2);
    expect(confirm.body.participantes).toHaveLength(2);

    const listagem = await request(app.getHttpServer())
      .get(`/api/v1/eventos/${eventoId}/participantes`)
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(listagem.body.dados).toHaveLength(2);
    expect(listagem.body.resumo.totalParticipantes).toBe(2);
  });

  it('retorna 400 ao importar sem arquivo', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/eventos/${eventoId}/participantes/importacao`)
      .auth(token, { type: 'bearer' })
      .expect(400);
  });

  it('retorna 404 para evento inexistente', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/eventos/999999999/participantes')
      .auth(token, { type: 'bearer' })
      .expect(404);
  });
});
