import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Grupos (e2e)', () => {
  let app: INestApplication<App>;

  const EVENT_ID = 1;
  const GROUP_ID = 7;

  const groupWithCount = {
    id: GROUP_ID,
    nome: 'Alfa',
    cor: '#FF5733',
    _count: { participantes: 2 },
  };

  const prismaMock = {
    evento: { findUnique: vi.fn() },
    grupo: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    participante: { count: vi.fn() },
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';

    // Import dinâmico para que o ConfigModule valide as variáveis de ambiente
    // somente depois que DATABASE_URL estiver definida.
    const { AppModule } = await import('../src/app.module.js');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET /eventos/{eventoId}/grupos lista os grupos do evento', async () => {
    prismaMock.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prismaMock.grupo.findMany.mockResolvedValue([groupWithCount]);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/eventos/${EVENT_ID}/grupos`)
      .expect(200);

    expect(response.body).toEqual([
      {
        id: GROUP_ID,
        nome: 'Alfa',
        cor: '#FF5733',
        quantidadeParticipantes: 2,
      },
    ]);
  });

  it('GET /eventos/{eventoId}/grupos retorna 404 para evento inexistente', async () => {
    prismaMock.evento.findUnique.mockResolvedValue(null);

    await request(app.getHttpServer())
      .get(`/api/v1/eventos/${EVENT_ID}/grupos`)
      .expect(404);
  });

  it('POST /eventos/{eventoId}/grupos cria um grupo (201)', async () => {
    prismaMock.evento.findUnique.mockResolvedValue({ id: EVENT_ID });
    prismaMock.grupo.create.mockResolvedValue({
      ...groupWithCount,
      _count: { participantes: 0 },
    });

    const response = await request(app.getHttpServer())
      .post(`/api/v1/eventos/${EVENT_ID}/grupos`)
      .send({ nome: 'Alfa', cor: '#FF5733' })
      .expect(201);

    expect(response.body).toEqual({
      id: GROUP_ID,
      nome: 'Alfa',
      cor: '#FF5733',
      quantidadeParticipantes: 0,
    });
  });

  it('POST rejeita payload inválido (400)', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/eventos/${EVENT_ID}/grupos`)
      .send({ nome: '', cor: 'vermelho' })
      .expect(400);
  });

  it('GET /eventos/{eventoId}/grupos/{grupoId} retorna o grupo', async () => {
    prismaMock.grupo.findUnique.mockResolvedValue(groupWithCount);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/eventos/${EVENT_ID}/grupos/${GROUP_ID}`)
      .expect(200);

    expect(response.body).toEqual({
      id: GROUP_ID,
      nome: 'Alfa',
      cor: '#FF5733',
      quantidadeParticipantes: 2,
    });
  });

  it('GET retorna 404 quando o grupo não pertence ao evento', async () => {
    prismaMock.grupo.findUnique.mockResolvedValue(null);
    prismaMock.evento.findUnique.mockResolvedValue({ id: EVENT_ID });

    await request(app.getHttpServer())
      .get(`/api/v1/eventos/${EVENT_ID}/grupos/${GROUP_ID}`)
      .expect(404);
  });

  it('PATCH atualiza o grupo (200)', async () => {
    prismaMock.grupo.findUnique.mockResolvedValue({ id: GROUP_ID });
    prismaMock.grupo.update.mockResolvedValue({
      ...groupWithCount,
      nome: 'Alfa Prime',
    });

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/eventos/${EVENT_ID}/grupos/${GROUP_ID}`)
      .send({ nome: 'Alfa Prime' })
      .expect(200);

    expect(response.body.nome).toBe('Alfa Prime');
  });

  it('DELETE exclui o grupo (204)', async () => {
    prismaMock.grupo.findUnique.mockResolvedValue({ id: GROUP_ID });
    prismaMock.participante.count.mockResolvedValue(0);
    prismaMock.grupo.delete.mockResolvedValue({ id: GROUP_ID });

    await request(app.getHttpServer())
      .delete(`/api/v1/eventos/${EVENT_ID}/grupos/${GROUP_ID}`)
      .expect(204);
  });

  it('DELETE recusa excluir grupo com participantes (409)', async () => {
    prismaMock.grupo.findUnique.mockResolvedValue({ id: GROUP_ID });
    prismaMock.participante.count.mockResolvedValue(3);

    await request(app.getHttpServer())
      .delete(`/api/v1/eventos/${EVENT_ID}/grupos/${GROUP_ID}`)
      .expect(409);
  });

  it('rejeita identificador não numérico (400)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/eventos/${EVENT_ID}/grupos/abc`)
      .expect(400);
  });
});
