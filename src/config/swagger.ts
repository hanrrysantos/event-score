import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ErroPadraoDto } from '../common/dto/erro-padrao.dto.js';
import { ErroValidacaoDto } from '../common/dto/erro-validacao.dto.js';
import { AtualizarEventoDto } from '../modules/eventos/dto/atualizar-evento.dto.js';
import { CriarEventoDto } from '../modules/eventos/dto/criar-evento.dto.js';
import { EventoDetalheDto } from '../modules/eventos/dto/evento-detalhe.dto.js';
import { EventoResumoDto } from '../modules/eventos/dto/evento-resumo.dto.js';
import { AtualizarGrupoDto } from '../modules/grupos/dto/atualizar-grupo.dto.js';
import { CriarGrupoDto } from '../modules/grupos/dto/criar-grupo.dto.js';
import { GrupoResumoDto } from '../modules/grupos/dto/grupo-resumo.dto.js';

export function configurarSwagger(app: INestApplication): void {
  const swaggerConfig = new DocumentBuilder()
    .setTitle('EventScore API')
    .setDescription('API de apuração e gestão do EventScore (Arena Comp 2026)')
    .setVersion('0.1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Informe o JWT recebido em POST /api/v1/auth/login.',
      },
      'bearer',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    // Mantém disponíveis também os schemas usados nas respostas de erro.
    extraModels: [
      CriarEventoDto,
      AtualizarEventoDto,
      EventoResumoDto,
      EventoDetalheDto,
      CriarGrupoDto,
      AtualizarGrupoDto,
      GrupoResumoDto,
      ErroPadraoDto,
      ErroValidacaoDto,
    ],
  });
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}
