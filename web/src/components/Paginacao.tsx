import type { Schemas } from '../api/client';

/** Anterior / Página X de Y / Próxima, para as listas paginadas do contrato (?pagina=&tamanho=). */
export default function Paginacao({ meta, irPara }: { meta?: Schemas['PaginacaoMetaDto']; irPara: (pagina: number) => void }) {
  if (!meta || meta.totalPaginas <= 1) return null;
  return (
    <nav className="paginacao" aria-label="Páginas">
      <button className="btn btn-cinza" disabled={meta.pagina <= 1} onClick={() => irPara(meta.pagina - 1)}>
        Anterior
      </button>
      <span>
        Página {meta.pagina} de {meta.totalPaginas}
      </span>
      <button className="btn btn-cinza" disabled={meta.pagina >= meta.totalPaginas} onClick={() => irPara(meta.pagina + 1)}>
        Próxima
      </button>
    </nav>
  );
}
