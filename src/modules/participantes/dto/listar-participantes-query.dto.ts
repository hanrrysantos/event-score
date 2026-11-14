import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginacaoQueryDto } from '../../../common/dto/paginacao-query.dto.js';

/** Filtros adicionais da listagem de participantes (além da paginação). */
export class ListarParticipantesQueryDto extends PaginacaoQueryDto {
  @ApiPropertyOptional({
    description: 'Filtra participantes pelo grupo.',
    type: 'integer',
    minimum: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  grupoId?: number;

  @ApiPropertyOptional({
    description: 'Filtra participantes pela turma.',
    example: 'A1',
  })
  @IsOptional()
  @IsString()
  turma?: string;

  @ApiPropertyOptional({
    description: 'Busca por nome ou matrícula.',
    example: 'João',
  })
  @IsOptional()
  @IsString()
  busca?: string;
}
