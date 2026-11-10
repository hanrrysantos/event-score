import { ApiProperty } from '@nestjs/swagger';

/** Erro 400 disparado pelo ValidationPipe (lista de mensagens). */
export class ErroValidacaoDto {
  @ApiProperty({
    description: 'Código de status HTTP de validação (400).',
    type: 'integer',
    example: 400,
  })
  statusCode: number;

  @ApiProperty({
    description:
      'Lista de mensagens detalhando as inconsistências dos campos validados.',
    type: [String],
    example: [
      'nome não pode estar vazio',
      'cor deve ser um código hexadecimal válido no formato #RRGGBB',
    ],
  })
  message: string[];

  @ApiProperty({
    description: 'Denominação canônica do erro.',
    example: 'Bad Request',
  })
  error: string;
}
