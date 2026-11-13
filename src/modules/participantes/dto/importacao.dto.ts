import { ApiProperty } from '@nestjs/swagger';
import { ParticipanteResumoDto } from './participante-resumo.dto.js';

export class ImportacaoErroDto {
  @ApiProperty({
    description: 'Número da linha do arquivo (o cabeçalho é a linha 1).',
    type: 'integer',
    example: 3,
  })
  linha: number;

  @ApiProperty({
    description: 'Descrição do problema encontrado na linha.',
    example: "matricula '123' duplicada no arquivo",
  })
  problema: string;
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
  validas: number;

  @ApiProperty({
    description: 'Quantidade de linhas inválidas.',
    type: 'integer',
    example: 2,
  })
  invalidas: number;

  @ApiProperty({
    description: 'Problemas encontrados por linha inválida.',
    type: () => [ImportacaoErroDto],
  })
  erros: ImportacaoErroDto[];
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
