import type { Schemas } from '../../api/client';

export type Grupo = Schemas['GrupoResumoDto'];

export function PontoCor({ cor }: { cor: string }) {
  return <span className="ponto-cor" style={{ background: cor }} aria-hidden="true" />;
}
