import {
  type ArgumentsHost,
  BadRequestException,
  ConflictException,
  HttpStatus,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces/index.js';
import type { Request, Response } from 'express';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../../generated/prisma/client.js';
import {
  HttpExceptionFilter,
  MENSAGEM_CONFLITO_RELACIONAMENTO_GENERICO,
  MENSAGEM_GRUPO_BLOQUEADO_POR_RESULTADO,
} from './http-exception.filter.js';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: Pick<Response, 'status' | 'json'>;
  let mockRequest: Partial<Request>;
  let mockHttpArgumentsHost: HttpArgumentsHost;
  let mockArgumentsHost: ArgumentsHost;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NODE_ENV = 'test';

    filter = new HttpExceptionFilter();

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/api/v1/eventos',
      method: 'POST',
    };

    mockHttpArgumentsHost = {
      getResponse: vi.fn().mockReturnValue(mockResponse),
      getRequest: vi.fn().mockReturnValue(mockRequest),
      getNext: vi.fn(),
    };

    mockArgumentsHost = {
      switchToHttp: vi.fn().mockReturnValue(mockHttpArgumentsHost),
      getArgs: vi.fn(),
      getArgByIndex: vi.fn(),
      switchToRpc: vi.fn(),
      switchToWs: vi.fn(),
      getType: vi.fn().mockReturnValue('http'),
    };
  });

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  describe('Exceções HTTP padrão do NestJS', () => {
    it('formata BadRequestException (400) com mensagem em string', () => {
      const exception = new BadRequestException('Parâmetro inválido');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: 'Parâmetro inválido',
        error: 'Bad Request',
      });
    });

    it('formata BadRequestException (400) com array de mensagens (ValidationPipe)', () => {
      const mensagens = [
        'nome não pode estar vazio',
        'cor deve ser um código hexadecimal válido no formato #RRGGBB',
      ];
      const exception = new BadRequestException(mensagens);

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 400,
        message: mensagens,
        error: 'Bad Request',
      });
    });

    it('formata NotFoundException (404)', () => {
      const exception = new NotFoundException('Evento não encontrado');

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 404,
        message: 'Evento não encontrado',
        error: 'Not Found',
      });
    });

    it('formata ConflictException (409)', () => {
      const exception = new ConflictException(
        'Já existe um grupo cadastrado com este nome no evento',
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 409,
        message: 'Já existe um grupo cadastrado com este nome no evento',
        error: 'Conflict',
      });
    });

    it('formata UnprocessableEntityException (422)', () => {
      const exception = new UnprocessableEntityException(
        'A data informada está fora do período do evento',
      );

      filter.catch(exception, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 422,
        message: 'A data informada está fora do período do evento',
        error: 'Unprocessable Entity',
      });
    });
  });

  describe('Mapeamento de erros do Prisma e PostgreSQL', () => {
    it('mapeia erro Prisma P2002 (violação de unicidade) para 409 Conflict', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`nome`, `ano`)',
        {
          code: 'P2002',
          clientVersion: '7.10.1',
          meta: { target: ['nome', 'ano'] },
        },
      );

      filter.catch(prismaError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 409,
        message: 'Já existe um registro com os dados informados',
        error: 'Conflict',
      });
    });

    it('mapeia erro Prisma P2025 (registro não encontrado) para 404 Not Found', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'An operation failed because it depends on one or more records that were required but not found.',
        {
          code: 'P2025',
          clientVersion: '7.10.1',
        },
      );

      filter.catch(prismaError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 404,
        message: 'Recurso não encontrado',
        error: 'Not Found',
      });
    });

    it('mapeia erro Prisma P2003 com restrict_violation (RF03) para 409 Conflict com mensagem específica', () => {
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint violated on the (not available)',
        {
          code: 'P2003',
          clientVersion: '7.10.1',
          meta: {
            driverAdapterError: {
              cause: {
                kind: 'RestrictViolation',
                originalCode: '23001',
                originalMessage:
                  'Grupos nao podem ser alterados apos o lancamento de resultados no evento 1',
              },
            },
          },
        },
      );

      filter.catch(prismaError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 409,
        message: MENSAGEM_GRUPO_BLOQUEADO_POR_RESULTADO,
        error: 'Conflict',
      });
    });

    it('distingue erro Prisma P2003 genérico (outra tabela/relação) retornando mensagem de conflito sem atribuir a grupos', () => {
      const genericP2003 = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint violated on the field: `id_evento`',
        {
          code: 'P2003',
          clientVersion: '7.10.1',
          meta: {
            field_name: 'id_evento',
          },
        },
      );

      filter.catch(genericP2003, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 409,
        message: MENSAGEM_CONFLITO_RELACIONAMENTO_GENERICO,
        error: 'Conflict',
      });
    });

    it('mapeia erro de trigger mencionando bloqueio de grupos após resultados para 409 Conflict', () => {
      const triggerError = new Error(
        'Grupos nao podem ser alterados apos o lancamento de resultados no evento 1 (23001: restrict_violation)',
      );

      filter.catch(triggerError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 409,
        message: MENSAGEM_GRUPO_BLOQUEADO_POR_RESULTADO,
        error: 'Conflict',
      });
    });
  });

  describe('Observabilidade e erros internos', () => {
    it('mapeia erro genérico desconhecido para 500 Internal Server Error higienizado', () => {
      const genericError = new Error('Falha inesperada de conexão');

      filter.catch(genericError, mockArgumentsHost);

      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Erro interno do servidor',
        error: 'Internal Server Error',
      });
    });

    it('registra log com mensagem e stack trace em ambiente fora de teste (produção/desenvolvimento)', () => {
      process.env.NODE_ENV = 'production';
      const loggerSpy = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      const genericError = new Error('Erro crítico do banco de dados');

      filter.catch(genericError, mockArgumentsHost);

      expect(loggerSpy).toHaveBeenCalledWith(
        'Erro crítico do banco de dados',
        genericError.stack,
      );
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        statusCode: 500,
        message: 'Erro interno do servidor',
        error: 'Internal Server Error',
      });
    });

    it('silencia Logger.error durante testes automatizados (NODE_ENV === "test")', () => {
      process.env.NODE_ENV = 'test';
      const loggerSpy = vi
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      const genericError = new Error('Erro durante teste');

      filter.catch(genericError, mockArgumentsHost);

      expect(loggerSpy).not.toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    });
  });
});
