import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const DATA_SOMENTE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CriarEventoDto {
  @ApiProperty({
    description: 'Nome de exibição do evento.',
    example: 'Arena Comp 2026',
    minLength: 1,
    maxLength: 100,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  nome: string;

  @ApiProperty({
    description: 'Ano de realização da competição.',
    type: 'integer',
    example: 2026,
    minimum: 2000,
    maximum: 2100,
  })
  @IsInt()
  @Min(2000)
  @Max(2100)
  ano: number;

  @ApiProperty({
    description: 'Data de início do evento.',
    example: '2026-11-20',
    format: 'date',
  })
  @IsDateString({ strict: true })
  @Matches(DATA_SOMENTE_PATTERN, {
    message: 'dataInicio deve estar no formato YYYY-MM-DD',
  })
  dataInicio: string;

  @ApiProperty({
    description: 'Data de término do evento.',
    example: '2026-11-22',
    format: 'date',
  })
  @IsDateString({ strict: true })
  @Matches(DATA_SOMENTE_PATTERN, {
    message: 'dataFim deve estar no formato YYYY-MM-DD',
  })
  dataFim: string;

  @ApiProperty({
    description: 'Quantidade configurada de dias de competição.',
    type: 'integer',
    example: 3,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  quantidadeDias: number;
}
