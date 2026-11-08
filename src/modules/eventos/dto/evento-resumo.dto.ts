import { ApiProperty } from '@nestjs/swagger';

export class EventoResumoDto {
  @ApiProperty({
    description: 'Identificador numérico único do evento.',
    type: 'integer',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nome oficial do evento.',
    example: 'Arena Comp 2026',
  })
  nome: string;

  @ApiProperty({
    description: 'Ano de realização do evento.',
    type: 'integer',
    example: 2026,
  })
  ano: number;

  @ApiProperty({
    description: 'Data inicial do evento.',
    example: '2026-11-20',
    format: 'date',
  })
  dataInicio: string;

  @ApiProperty({
    description: 'Data final do evento.',
    example: '2026-11-22',
    format: 'date',
  })
  dataFim: string;

  @ApiProperty({
    description: 'Indica se este é o evento ativo atual.',
    example: true,
  })
  ativo: boolean;

  @ApiProperty({
    description: 'Quantidade de dias de competição configurada.',
    type: 'integer',
    example: 3,
    minimum: 1,
  })
  quantidadeDias: number;
}
