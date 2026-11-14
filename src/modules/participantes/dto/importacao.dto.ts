import { ApiProperty } from '@nestjs/swagger';
import { ParticipanteResumoDto } from './participante-resumo.dto.js';

export class ImportacaoLinhaDto {
  @ApiProperty({
    description: 'Número da linha do arquivo (o cabeçalho é a linha 1).',
    type: 'integer',
    example: 3,
  })
  linha: number;

  @ApiProperty({ description: 'Nome da linha.', example: 'João da Silva' })
  nome: string;

  @ApiProperty({ description: 'Matrícula da linha.', example: '2023001' })
  matricula: string;

  @ApiProperty({ description: 'Turma da linha.', example: 'A1' })
  turma: string;

  @ApiProperty({ description: 'Grupo informado na linha.', example: 'Alfa' })
  grupo: string;

  @ApiProperty({
    description: 'Situação da linha após a validação.',
    enum: ['VALIDO', 'ERRO'],
    example: 'VALIDO',
  })
  status: 'VALIDO' | 'ERRO';

  @ApiProperty({
    description:
      'Motivo do erro quando status é ERRO; null quando a linha é válida.',
    example: null,
    nullable: true,
  })
  motivoErro: string | null;
}

export class ImportacaoPrevistaDto {
  @ApiProperty({
    description: 'Total de linhas de dados do arquivo.',
    type: 'integer',
    example: 10,
  })
  totalLinhas: number;

  @ApiProperty({
    description: 'Quantidade de linhas válidas.',
    type: 'integer',
    example: 8,
  })
  linhasValidas: number;

  @ApiProperty({
    description: 'Quantidade de linhas com erro.',
    type: 'integer',
    example: 2,
  })
  linhasComErro: number;

  @ApiProperty({
    description: 'Todas as linhas do arquivo, com status e motivo de erro.',
    type: () => [ImportacaoLinhaDto],
  })
  linhas: ImportacaoLinhaDto[];
}

export class ImportacaoConfirmadaDto {
  @ApiProperty({
    description: 'Quantidade de participantes importados.',
    type: 'integer',
    example: 8,
  })
  importados: number;

  @ApiProperty({
    description: 'Participantes criados pela importação.',
    type: () => [ParticipanteResumoDto],
  })
  participantes: ParticipanteResumoDto[];
}
