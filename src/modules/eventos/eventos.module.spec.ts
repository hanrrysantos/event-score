import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AtualizarEventoDto } from './dto/atualizar-evento.dto.js';
import { CriarEventoDto } from './dto/criar-evento.dto.js';
import { EventoDetalheDto } from './dto/evento-detalhe.dto.js';
import { EventoResumoDto } from './dto/evento-resumo.dto.js';
import { EventosController } from './eventos.controller.js';
import { EventosModule } from './eventos.module.js';
import { EventosService } from './eventos.service.js';

describe('EventosModule', () => {
  it('disponibiliza controller e service sem acessar o banco', async () => {
    const module = await Test.createTestingModule({
      imports: [EventosModule],
    }).compile();

    expect(module.get(EventosController)).toBeInstanceOf(EventosController);
    expect(module.get(EventosService)).toBeInstanceOf(EventosService);
    await module.close();
  });

  it('expõe no Swagger os DTOs definidos no contrato', async () => {
    const module = await Test.createTestingModule({
      imports: [EventosModule],
    }).compile();
    const app = module.createNestApplication();
    await app.init();

    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().build(),
      {
        extraModels: [
          CriarEventoDto,
          AtualizarEventoDto,
          EventoResumoDto,
          EventoDetalheDto,
        ],
      },
    );

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

    await app.close();
  });
});
