import { ApiProperty } from '@nestjs/swagger';
import { EventoResumoDto } from './evento-resumo.dto.js';

export class EventoDetalheDto extends EventoResumoDto {
  @ApiProperty({
    description: 'Indica se o evento já possui algum resultado lançado.',
    example: false,
  })
  temResultado: boolean;
}
