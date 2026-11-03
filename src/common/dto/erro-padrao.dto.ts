import { ApiProperty } from '@nestjs/swagger';

/** Erro padrão do NestJS para 401, 404, 409 e 422. */
export class ErroPadraoDto {
  @ApiProperty({ description: 'Código de status HTTP.', example: 404 })
  statusCode: number;

  @ApiProperty({
    description: 'Mensagem descritiva do erro.',
    example: 'Recurso não encontrado',
  })
  message: string;

  @ApiProperty({ description: 'Nome do status HTTP.', example: 'Not Found' })
  error: string;
}
