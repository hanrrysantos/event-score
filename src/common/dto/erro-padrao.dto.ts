import { ApiProperty } from '@nestjs/swagger';

/** Erro padrão do NestJS para 401, 404, 409 e 422. */
export class ErroPadraoDto {
  @ApiProperty({
    description: 'Código de status HTTP correspondente.',
    type: 'integer',
    example: 404,
  })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem descritiva do erro em português.',
    example: 'Recurso não encontrado',
  })
  message: string;

  @ApiProperty({
    description: 'Denominação canônica do status HTTP do erro.',
    example: 'Not Found',
  })
  error: string;
}
