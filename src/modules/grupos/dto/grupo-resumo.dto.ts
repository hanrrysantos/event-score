import { ApiProperty } from '@nestjs/swagger';

export class GrupoResumoDto {
  @ApiProperty({
    description: 'Identificador numérico único do grupo.',
    type: 'integer',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nome oficial do grupo ou equipe.',
    example: 'Alfa',
  })
  nome: string;

  @ApiProperty({
    description:
      'Código de cor hexadecimal identificador da equipe no formato #RRGGBB.',
    example: '#FF5733',
  })
  cor: string;

  @ApiProperty({
    description: 'Quantidade total de participantes vinculados ao grupo.',
    type: 'integer',
    minimum: 0,
    example: 12,
  })
  quantidadeParticipantes: number;
}
