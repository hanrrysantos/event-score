import { ApiProperty } from '@nestjs/swagger';

export class DiaEventoResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 1 })
  numeroDia!: number;

  @ApiProperty({ format: 'date', example: '2026-11-20' })
  data!: string;
}
