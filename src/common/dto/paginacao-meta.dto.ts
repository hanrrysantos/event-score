import { ApiProperty } from '@nestjs/swagger';

/** Metadados de paginação devolvidos no envelope de listagem. */
export class PaginacaoMetaDto {
  @ApiProperty({ description: 'Página atual (começa em 1).', example: 1 })
  pagina: number;

  @ApiProperty({ description: 'Itens por página.', example: 20 })
  tamanho: number;

  @ApiProperty({ description: 'Total de registros encontrados.', example: 45 })
  totalItens: number;

  @ApiProperty({ description: 'Total de páginas disponíveis.', example: 3 })
  totalPaginas: number;
}
