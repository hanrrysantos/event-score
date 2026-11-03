import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginacaoMetaDto } from './paginacao-meta.dto.js';

/**
 * Envelope para listagens com metadados ou métricas (participantes,
 * frequência, classificação e apuração), conforme contrato T06.
 * Listas simples continuam retornando array direto.
 *
 * Como o Swagger não resolve genéricos, cada endpoint deve documentar
 * `dados` (e `resumo`, se houver) com uma subclasse concreta ou
 * `@ApiExtraModels` + `getSchemaPath`.
 */
export class EnvelopeListagemDto<T, R = unknown> {
  dados: T[];

  @ApiPropertyOptional({ type: () => PaginacaoMetaDto })
  paginacao?: PaginacaoMetaDto;

  resumo?: R;
}
