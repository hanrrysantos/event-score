import { ApiProperty } from '@nestjs/swagger';

/** Erro 400 disparado pelo ValidationPipe (lista de mensagens). */
export class ErroValidacaoDto {
  @ApiProperty({ description: 'Código de status HTTP.', example: 400 })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagens de validação dos campos.',
    type: [String],
    example: [
      'nome should not be empty',
      'cor must match /^#[0-9A-Fa-f]{6}$/ regular expression',
    ],
  })
  message: string[];

  @ApiProperty({ description: 'Nome do status HTTP.', example: 'Bad Request' })
  error: string;
}
