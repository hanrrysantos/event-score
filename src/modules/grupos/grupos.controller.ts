import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ErroPadraoDto } from '../../common/dto/erro-padrao.dto.js';
import { AtualizarGrupoDto } from './dto/atualizar-grupo.dto.js';
import { CriarGrupoDto } from './dto/criar-grupo.dto.js';
import { GrupoResumoDto } from './dto/grupo-resumo.dto.js';
import { GruposService } from './grupos.service.js';

@ApiTags('Grupos')
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
@Controller('eventos/:eventoId/grupos')
export class GruposController {
  constructor(private readonly grupos: GruposService) {}

  @Get()
  @ApiOperation({ summary: 'Listar grupos do evento' })
  @ApiOkResponse({ type: GrupoResumoDto, isArray: true })
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  async list(
    @Param('eventoId', ParseIntPipe) eventId: number,
  ): Promise<GrupoResumoDto[]> {
    return this.grupos.list(eventId);
  }

  @Post()
  @ApiOperation({ summary: 'Criar grupo no evento' })
  @ApiCreatedResponse({ type: GrupoResumoDto })
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  @ApiConflictResponse({ type: ErroPadraoDto })
  async create(
    @Param('eventoId', ParseIntPipe) eventId: number,
    @Body() dto: CriarGrupoDto,
  ): Promise<GrupoResumoDto> {
    return this.grupos.create(eventId, dto);
  }

  @Get(':grupoId')
  @ApiOperation({ summary: 'Consultar grupo por ID' })
  @ApiOkResponse({ type: GrupoResumoDto })
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  @ApiParam({
    name: 'grupoId',
    description: 'Identificador numérico único do grupo.',
    type: 'integer',
    example: 1,
  })
  async findById(
    @Param('eventoId', ParseIntPipe) eventId: number,
    @Param('grupoId', ParseIntPipe) groupId: number,
  ): Promise<GrupoResumoDto> {
    return this.grupos.findById(eventId, groupId);
  }

  @Patch(':grupoId')
  @ApiOperation({ summary: 'Atualizar grupo do evento' })
  @ApiOkResponse({ type: GrupoResumoDto })
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  @ApiConflictResponse({ type: ErroPadraoDto })
  @ApiParam({
    name: 'grupoId',
    description: 'Identificador numérico único do grupo.',
    type: 'integer',
    example: 1,
  })
  async update(
    @Param('eventoId', ParseIntPipe) eventId: number,
    @Param('grupoId', ParseIntPipe) groupId: number,
    @Body() dto: AtualizarGrupoDto,
  ): Promise<GrupoResumoDto> {
    return this.grupos.update(eventId, groupId, dto);
  }

  @Delete(':grupoId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Excluir grupo do evento' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ type: ErroPadraoDto })
  @ApiConflictResponse({ type: ErroPadraoDto })
  @ApiParam({
    name: 'grupoId',
    description: 'Identificador numérico único do grupo.',
    type: 'integer',
    example: 1,
  })
  async remove(
    @Param('eventoId', ParseIntPipe) eventId: number,
    @Param('grupoId', ParseIntPipe) groupId: number,
  ): Promise<void> {
    await this.grupos.remove(eventId, groupId);
  }
}
