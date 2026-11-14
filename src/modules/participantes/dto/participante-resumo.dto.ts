import { ApiProperty } from '@nestjs/swagger';

export class ParticipanteResumoDto {
  @ApiProperty({
    description: 'Identificador numérico único do participante.',
    type: 'integer',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nome completo do participante.',
    example: 'João da Silva',
  })
  nome: string;

  @ApiProperty({
    description: 'Matrícula do participante (única por evento).',
    example: '2023001',
  })
  matricula: string;

  @ApiProperty({ description: 'Turma do participante.', example: 'A1' })
  turma: string;

  @ApiProperty({
    description: 'Identificador do grupo ao qual o participante pertence.',
    type: 'integer',
    example: 1,
  })
  grupoId: number;

  @ApiProperty({
    description: 'Nome do grupo do participante.',
    example: 'Alfa',
  })
  grupo: string;
}
