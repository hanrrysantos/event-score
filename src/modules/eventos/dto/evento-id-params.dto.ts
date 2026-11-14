import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';

export class EventoIdParamsDto {
  @ApiProperty({
    description: 'Identificador numérico único do evento.',
    type: 'integer',
    minimum: 1,
    maximum: 2_147_483_647,
    example: 1,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value,
  )
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  eventoId: number;
}
