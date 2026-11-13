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
} from '@nestjs/swagger';
import { ErroPadraoDto } from '../../common/dto/erro-padrao.dto.js';
import { PaginacaoQueryDto } from '../../common/dto/paginacao-query.dto.js';
import {
  ImportacaoConfirmadaDto,
  ImportacaoPrevistaDto,
} from './dto/importacao.dto.js';
import { ParticipanteResumoDto } from './dto/participante-resumo.dto.js';
import { ParticipantesService } from './participantes.service.js';

interface UploadedFile {
  buffer: Buffer;
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
    @Query() query: PaginacaoQueryDto,
  ) {
    return this.participantes.list(eventId, query);
  }

  @Post('importacao')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiOperation({ summary: 'Pré-visualizar importação de participantes' })
  @ApiConsumes('multipart/form-data')
  @ApiOkResponse({ type: ImportacaoPrevistaDto })
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  preview(
    @Param('eventoId', ParseIntPipe) eventId: number,
    @UploadedFile() file?: UploadedFile,
  ): Promise<ImportacaoPrevistaDto> {
    return this.participantes.previewImport(
      eventId,
      this.requireFileBuffer(file),
    );
  }

  @Post('importacao/confirmar')
  @UseInterceptors(FileInterceptor('arquivo'))
  @ApiOperation({ summary: 'Confirmar e importar participantes' })
  @ApiConsumes('multipart/form-data')
  @ApiCreatedResponse({ type: ImportacaoConfirmadaDto })
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  confirm(
    @Param('eventoId', ParseIntPipe) eventId: number,
    @UploadedFile() file?: UploadedFile,
  ): Promise<ImportacaoConfirmadaDto> {
    return this.participantes.confirmImport(
      eventId,
      this.requireFileBuffer(file),
    );
  }

  private requireFileBuffer(file?: UploadedFile): Buffer {
    if (!file || !file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Arquivo CSV é obrigatório');
    }
    return file.buffer;
  }
}
