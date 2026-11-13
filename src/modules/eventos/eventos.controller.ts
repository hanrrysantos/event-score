import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErroPadraoDto } from '../../common/dto/erro-padrao.dto.js';
import { ErroValidacaoDto } from '../../common/dto/erro-validacao.dto.js';
import { AtualizarEventoDto } from './dto/atualizar-evento.dto.js';
import { CriarEventoDto } from './dto/criar-evento.dto.js';
import { EventoDetalheDto } from './dto/evento-detalhe.dto.js';
import { EventoIdParamsDto } from './dto/evento-id-params.dto.js';
import { EventoResumoDto } from './dto/evento-resumo.dto.js';
import { EventosService } from './eventos.service.js';

const parametroEventoId = {
  name: 'eventoId',
  description: 'Identificador numérico único do evento.',
  schema: { type: 'integer', minimum: 1, maximum: 2_147_483_647 },
  example: 1,
};

const respostaRequisicaoInvalida = {
  description: 'Identificador ou dados do evento inválidos.',
  schema: {
    oneOf: [
      { $ref: getSchemaPath(ErroValidacaoDto) },
      { $ref: getSchemaPath(ErroPadraoDto) },
    ],
  },
};

@ApiTags('Eventos')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Token ausente, inválido ou expirado.',
  type: ErroPadraoDto,
})
@Controller('eventos')
export class EventosController {
  constructor(private readonly eventos: EventosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar eventos', operationId: 'listarEventos' })
  @ApiOkResponse({ type: EventoResumoDto, isArray: true })
  listar(): Promise<EventoResumoDto[]> {
    return this.eventos.listar();
  }

  @Post()
  @ApiOperation({ summary: 'Criar novo evento', operationId: 'criarEvento' })
  @ApiCreatedResponse({ type: EventoResumoDto })
  @ApiBadRequestResponse(respostaRequisicaoInvalida)
  @ApiConflictResponse({
    description: 'Já existe um evento com o mesmo nome e ano.',
    type: ErroPadraoDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'Período ou quantidade de dias incompatíveis.',
    type: ErroPadraoDto,
  })
  criar(@Body() dto: CriarEventoDto): Promise<EventoResumoDto> {
    return this.eventos.criar(dto);
  }

  @Get('ativo')
  @ApiOperation({
    summary: 'Consultar evento ativo',
    operationId: 'obterEventoAtivo',
  })
  @ApiOkResponse({ type: EventoResumoDto })
  @ApiNotFoundResponse({
    description: 'Nenhum evento está ativo no momento.',
    type: ErroPadraoDto,
  })
  buscarAtivo(): Promise<EventoResumoDto> {
    return this.eventos.buscarAtivo();
  }

  @Get(':eventoId')
  @ApiOperation({
    summary: 'Consultar evento por ID',
    operationId: 'obterEventoPorId',
  })
  @ApiParam(parametroEventoId)
  @ApiOkResponse({ type: EventoDetalheDto })
  @ApiBadRequestResponse(respostaRequisicaoInvalida)
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  buscarPorId(@Param() params: EventoIdParamsDto): Promise<EventoDetalheDto> {
    return this.eventos.buscarPorId(params.eventoId);
  }

  @Patch(':eventoId')
  @ApiOperation({
    summary: 'Atualizar evento',
    operationId: 'atualizarEvento',
  })
  @ApiParam(parametroEventoId)
  @ApiOkResponse({ type: EventoResumoDto })
  @ApiBadRequestResponse(respostaRequisicaoInvalida)
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  @ApiConflictResponse({
    description: 'Já existe um evento com o mesmo nome e ano.',
    type: ErroPadraoDto,
  })
  @ApiUnprocessableEntityResponse({
    description: 'A atualização invalida o período ou dias já cadastrados.',
    type: ErroPadraoDto,
  })
  atualizar(
    @Param() params: EventoIdParamsDto,
    @Body() dto: AtualizarEventoDto,
  ): Promise<EventoResumoDto> {
    return this.eventos.atualizar(params.eventoId, dto);
  }

  @Post(':eventoId/ativar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ativar evento', operationId: 'ativarEvento' })
  @ApiParam(parametroEventoId)
  @ApiOkResponse({ type: EventoResumoDto })
  @ApiBadRequestResponse(respostaRequisicaoInvalida)
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  ativar(@Param() params: EventoIdParamsDto): Promise<EventoResumoDto> {
    return this.eventos.ativar(params.eventoId);
  }
}
