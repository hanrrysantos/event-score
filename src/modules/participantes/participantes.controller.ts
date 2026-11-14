import {
  BadRequestException,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ErroPadraoDto } from '../../common/dto/erro-padrao.dto.js';
import {
  ImportacaoConfirmadaDto,
  ImportacaoPrevistaDto,
} from './dto/importacao.dto.js';
import { ListarParticipantesQueryDto } from './dto/listar-participantes-query.dto.js';
import { ParticipanteResumoDto } from './dto/participante-resumo.dto.js';
import { ParticipantesService } from './participantes.service.js';

const TAMANHO_MAXIMO_ARQUIVO = 5 * 1024 * 1024;

interface UploadedFile {
  buffer: Buffer;
  mimetype?: string;
  originalname?: string;
}

@ApiTags('Participantes')
@ApiBearerAuth()
@ApiUnauthorizedResponse({
  description: 'Token ausente, inválido ou expirado.',
  type: ErroPadraoDto,
})
@ApiParam({
  name: 'eventoId',
  description: 'Identificador numérico único do evento.',
  type: 'integer',
  example: 1,
})
@Controller('eventos/:eventoId/participantes')
export class ParticipantesController {
  constructor(private readonly participantes: ParticipantesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar participantes do evento' })
  @ApiOkResponse({ type: ParticipanteResumoDto, isArray: true })
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  list(
    @Param('eventoId', ParseIntPipe) eventId: number,
    @Query() query: ListarParticipantesQueryDto,
  ) {
    return this.participantes.list(eventId, query);
  }

  @Post('importacao/previa')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('arquivo', {
      limits: { fileSize: TAMANHO_MAXIMO_ARQUIVO },
    }),
  )
  @ApiOperation({ summary: 'Pré-visualizar importação de participantes' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ImportacaoPrevistaDto })
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  preview(
    @Param('eventoId', ParseIntPipe) eventId: number,
    @UploadedFile() file?: UploadedFile,
  ): Promise<ImportacaoPrevistaDto> {
    return this.participantes.previewImport(eventId, this.requireFile(file));
  }

  @Post('importacao')
  @UseInterceptors(
    FileInterceptor('arquivo', {
      limits: { fileSize: TAMANHO_MAXIMO_ARQUIVO },
    }),
  )
  @ApiOperation({ summary: 'Importar participantes (grava após validação)' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: ImportacaoConfirmadaDto })
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  @ApiUnprocessableEntityResponse({ type: ImportacaoPrevistaDto })
  confirm(
    @Param('eventoId', ParseIntPipe) eventId: number,
    @UploadedFile() file?: UploadedFile,
  ): Promise<ImportacaoConfirmadaDto> {
    return this.participantes.confirmImport(eventId, this.requireFile(file));
  }

  private requireFile(file?: UploadedFile): UploadedFile {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Arquivo CSV ou XLSX é obrigatório');
    }
    return file;
  }
}
