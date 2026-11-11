import type { INestApplication } from '@nestjs/common';
import type { OpenAPIObject } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { EventosModule } from '../modules/eventos/eventos.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { configurarSwagger } from './swagger.js';

describe('Swagger de eventos', () => {
  let app: INestApplication<App>;
  let document: OpenAPIObject;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [PrismaModule, EventosModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1', { exclude: ['health'] });
    configurarSwagger(app);
    await app.init();

    const response = await request(app.getHttpServer())
      .get('/api/docs-json')
      .expect(200);
    document = response.body as OpenAPIObject;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('publica os quatro DTOs na documentação HTTP usada pela aplicação', () => {
    expect(document.components?.schemas).toMatchObject({
      CriarEventoDto: {
        required: ['nome', 'ano', 'dataInicio', 'dataFim', 'quantidadeDias'],
      },
      AtualizarEventoDto: { type: 'object' },
      EventoResumoDto: {
        required: [
          'id',
          'nome',
          'ano',
          'dataInicio',
          'dataFim',
          'ativo',
          'quantidadeDias',
        ],
      },
      EventoDetalheDto: {
        required: [
          'id',
          'nome',
          'ano',
          'dataInicio',
          'dataFim',
          'ativo',
          'quantidadeDias',
          'temResultado',
        ],
      },
    });
    expect(document.components?.schemas?.AtualizarEventoDto).not.toHaveProperty(
      'required',
    );
  });

  it.each(['CriarEventoDto', 'AtualizarEventoDto'])(
    'publica os campos inteiros e limites de %s conforme o contrato',
    (schema) => {
      expect(document.components?.schemas?.[schema]).toMatchObject({
        properties: {
          ano: { type: 'integer', minimum: 2000, maximum: 2100 },
          quantidadeDias: { type: 'integer', minimum: 1 },
        },
      });
    },
  );

  it.each(['EventoResumoDto', 'EventoDetalheDto'])(
    'publica os campos inteiros de %s conforme o contrato',
    (schema) => {
      expect(document.components?.schemas?.[schema]).toMatchObject({
        properties: {
          id: { type: 'integer' },
          ano: { type: 'integer' },
          quantidadeDias: { type: 'integer', minimum: 1 },
        },
      });
    },
  );

  it('publica os DTOs de erro padronizados (ErroPadraoDto e ErroValidacaoDto)', () => {
    expect(document.components?.schemas).toMatchObject({
      ErroPadraoDto: {
        type: 'object',
        required: ['statusCode', 'message', 'error'],
        properties: {
          statusCode: { type: 'integer' },
          message: { type: 'string' },
          error: { type: 'string' },
        },
      },
      ErroValidacaoDto: {
        type: 'object',
        required: ['statusCode', 'message', 'error'],
        properties: {
          statusCode: { type: 'integer' },
          message: { type: 'array', items: { type: 'string' } },
          error: { type: 'string' },
        },
      },
    });
  });

  it('publica o esquema Bearer JWT para as rotas administrativas', () => {
    expect(document.components?.securitySchemes?.bearer).toMatchObject({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
    expect(document.security).toBeUndefined();
  });
});
