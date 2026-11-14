import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

const COR_HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export class CriarGrupoDto {
  @ApiProperty({
    description: 'Nome identificador do grupo.',
    example: 'Alfa',
    minLength: 1,
    maxLength: 50,
  })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nome: string;

  @ApiProperty({
    description: 'Código de cor hexadecimal no formato #RRGGBB.',
    example: '#FF5733',
    pattern: '^#[0-9A-Fa-f]{6}$',
  })
  @IsString()
  @Matches(COR_HEX_PATTERN, { message: 'cor deve estar no formato #RRGGBB' })
  cor: string;
}
