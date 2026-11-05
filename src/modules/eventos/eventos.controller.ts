import { Controller } from '@nestjs/common';
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { AtualizarEventoDto } from './dto/atualizar-evento.dto.js';
import { CriarEventoDto } from './dto/criar-evento.dto.js';
import { EventoDetalheDto } from './dto/evento-detalhe.dto.js';
import { EventoResumoDto } from './dto/evento-resumo.dto.js';

@ApiTags('Eventos')
@ApiBearerAuth()
@ApiExtraModels(
  CriarEventoDto,
  AtualizarEventoDto,
  EventoResumoDto,
  EventoDetalheDto,
)
@Controller('eventos')
export class EventosController {}
