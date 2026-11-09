import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig, {
    // Os DTOs precisam aparecer mesmo antes da implementação das rotas da T18.
    extraModels: [
      CriarEventoDto,
      AtualizarEventoDto,
      EventoResumoDto,
      EventoDetalheDto,
      CriarGrupoDto,
      AtualizarGrupoDto,
      GrupoResumoDto,
    ],
  });
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });
}
