import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Prisma } from '../../generated/prisma/client.js';

export const MENSAGEM_GRUPO_BLOQUEADO_POR_RESULTADO =
  'os grupos não podem mais ser alterados porque já há resultado lançado';

export const MENSAGEM_CONFLITO_RELACIONAMENTO_GENERICO =
  'Operação não permitida por restrição de relacionamento ou dependência inexistente';

export const MENSAGEM_ERRO_VALIDACAO_PRISMA =
  'Dados inválidos para a operação solicitada';

const NOMES_STATUS_HTTP: Record<number, string> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
};

interface CorpoErroPadrao {
  statusCode: number;
  message: string | string[];
  error: string;
}

interface ErroPrismaConhecido {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
}

/**
 * Filtro global que padroniza todas as respostas de erro no envelope
 * `{ statusCode, message, error }` acordado no contrato da API (T06 / T09)
 * e traduz erros conhecidos do Prisma/PostgreSQL (incluindo o bloqueio RF03).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const corpo = this.construirCorpoErro(exception);
    response.status(corpo.statusCode).json(corpo);
  }

  private construirCorpoErro(exception: unknown): CorpoErroPadrao {
    if (exception instanceof HttpException) {
      return this.tratarHttpException(exception);
    }

    if (this.ehErroValidacaoPrisma(exception)) {
      if (process.env.NODE_ENV !== 'test') {
        const mensagemLog =
          exception instanceof Error
            ? exception.message
            : 'Erro de validação do Prisma Client';
        const stackLog =
          exception instanceof Error ? exception.stack : undefined;
        this.logger.warn(mensagemLog, stackLog);
      }

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: MENSAGEM_ERRO_VALIDACAO_PRISMA,
        error: NOMES_STATUS_HTTP[HttpStatus.BAD_REQUEST],
      };
    }

    if (this.ehErroBloqueioGrupoPorResultado(exception)) {
      return {
        statusCode: HttpStatus.CONFLICT,
        message: MENSAGEM_GRUPO_BLOQUEADO_POR_RESULTADO,
        error: NOMES_STATUS_HTTP[HttpStatus.CONFLICT],
      };
    }

    if (this.ehErroPrismaConhecido(exception)) {
      return this.tratarErroPrisma(exception);
    }

    if (process.env.NODE_ENV !== 'test') {
      const mensagemLog =
        exception instanceof Error
          ? exception.message
          : 'Exceção interna desconhecida';
      const stackLog = exception instanceof Error ? exception.stack : undefined;
      this.logger.error(mensagemLog, stackLog);
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro interno do servidor',
      error: NOMES_STATUS_HTTP[HttpStatus.INTERNAL_SERVER_ERROR],
    };
  }

  private tratarHttpException(exception: HttpException): CorpoErroPadrao {
    const statusCode = exception.getStatus();
    const resposta = exception.getResponse();
    const erroPadrao =
      NOMES_STATUS_HTTP[statusCode] ??
      this.formatarNomeExcecao(exception.name) ??
      'Error';

    if (typeof resposta === 'string') {
      return {
        statusCode,
        message: resposta,
        error: erroPadrao,
      };
    }

    if (typeof resposta === 'object' && resposta !== null) {
      const objeto = resposta as Record<string, unknown>;
      const message =
        Array.isArray(objeto.message) || typeof objeto.message === 'string'
          ? (objeto.message as string | string[])
          : exception.message;
      const error =
        typeof objeto.error === 'string' && objeto.error.trim().length > 0
          ? objeto.error
          : erroPadrao;

      return {
        statusCode,
        message,
        error,
      };
    }

    return {
      statusCode,
      message: exception.message,
      error: erroPadrao,
    };
  }

  private tratarErroPrisma(exception: ErroPrismaConhecido): CorpoErroPadrao {
    switch (exception.code) {
      case 'P2002':
        return {
          statusCode: HttpStatus.CONFLICT,
          message: 'Já existe um registro com os dados informados',
          error: NOMES_STATUS_HTTP[HttpStatus.CONFLICT],
        };

      case 'P2025':
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: 'Recurso não encontrado',
          error: NOMES_STATUS_HTTP[HttpStatus.NOT_FOUND],
        };

      case 'P2003':
        if (this.ehErroBloqueioGrupoPorResultado(exception)) {
          return {
            statusCode: HttpStatus.CONFLICT,
            message: MENSAGEM_GRUPO_BLOQUEADO_POR_RESULTADO,
            error: NOMES_STATUS_HTTP[HttpStatus.CONFLICT],
          };
        }
        return {
          statusCode: HttpStatus.CONFLICT,
          message: MENSAGEM_CONFLITO_RELACIONAMENTO_GENERICO,
          error: NOMES_STATUS_HTTP[HttpStatus.CONFLICT],
        };

      default:
        if (process.env.NODE_ENV !== 'test') {
          this.logger.error(
            `Erro Prisma não mapeado (${exception.code}): ${exception.message}`,
          );
        }
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Erro interno do servidor',
          error: NOMES_STATUS_HTTP[HttpStatus.INTERNAL_SERVER_ERROR],
        };
    }
  }

  private ehErroValidacaoPrisma(exception: unknown): boolean {
    if (exception instanceof Prisma.PrismaClientValidationError) {
      return true;
    }

    return (
      typeof exception === 'object' &&
      exception !== null &&
      'name' in exception &&
      (exception as { name: unknown }).name === 'PrismaClientValidationError'
    );
  }

  private ehErroPrismaConhecido(
    exception: unknown,
  ): exception is ErroPrismaConhecido {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return true;
    }

    return (
      typeof exception === 'object' &&
      exception !== null &&
      'code' in exception &&
      typeof (exception as { code: unknown }).code === 'string' &&
      (exception as { code: string }).code.startsWith('P') &&
      'message' in exception &&
      typeof (exception as { message: unknown }).message === 'string'
    );
  }

  private ehErroBloqueioGrupoPorResultado(exception: unknown): boolean {
    const textoInspecionado =
      this.extrairTextoInspecao(exception).toLowerCase();
    if (!textoInspecionado) {
      return false;
    }

    if (
      textoInspecionado.includes('fn_grupo_bloqueia_apos_resultado') ||
      textoInspecionado.includes('trg_grupo_bloqueia_apos_resultado') ||
      textoInspecionado.includes(
        'grupos nao podem ser alterados apos o lancamento de resultados',
      ) ||
      textoInspecionado.includes(
        'grupos não podem ser alterados após o lançamento de resultados',
      )
    ) {
      return true;
    }

    const ehRestrictViolation =
      textoInspecionado.includes('23001') ||
      textoInspecionado.includes('restrict_violation') ||
      textoInspecionado.includes('restrictviolation');
    const mencionaGrupo = textoInspecionado.includes('grupo');

    return ehRestrictViolation && mencionaGrupo;
  }

  private extrairTextoInspecao(exception: unknown): string {
    if (typeof exception !== 'object' || exception === null) {
      return '';
    }

    const partes: string[] = [];
    const erro = exception as Record<string, unknown>;

    if (typeof erro.message === 'string') {
      partes.push(erro.message);
    }

    if (typeof erro.meta === 'object' && erro.meta !== null) {
      try {
        partes.push(JSON.stringify(erro.meta));
      } catch {
        // Ignora referências circulares ao inspecionar metadados
      }
    }

    return partes.join(' ');
  }

  private formatarNomeExcecao(nome: string): string {
    return nome
      .replace(/Exception$/, '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .trim();
  }
}
