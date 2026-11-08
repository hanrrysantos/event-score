import { useEffect, useState, type FormEvent } from 'react';
import { api, type Schemas } from '../../api/client';

type Participante = { id: number; matricula: string; nome: string; turma: string; grupoId: number; grupo: string };
type Pagina = { dados: Participante[]; paginacao: Schemas['PaginacaoMetaDto'] };

const TAMANHO = 20;

/** Lista paginada do contrato: GET /eventos/{eventoId}/participantes?pagina&tamanho&grupoId&busca. */
export default function ListaParticipantes({ eventoId, versao }: { eventoId: number; versao: number }) {
  const [grupos, setGrupos] = useState<Schemas['GrupoResumoDto'][]>([]);
  const [filtro, setFiltro] = useState({ busca: '', grupoId: '', pagina: 1 });
  const [texto, setTexto] = useState('');
  const [pagina, setPagina] = useState<Pagina>();
  const [erro, setErro] = useState('');

  useEffect(() => {
    api<Schemas['GrupoResumoDto'][]>(`/eventos/${eventoId}/grupos`)
      .then(setGrupos)
      .catch(() => {});
  }, [eventoId]);

  useEffect(() => {
    const params = new URLSearchParams({ pagina: String(filtro.pagina), tamanho: String(TAMANHO) });
    if (filtro.grupoId) params.set('grupoId', filtro.grupoId);
    if (filtro.busca) params.set('busca', filtro.busca);
    api<Pagina>(`/eventos/${eventoId}/participantes?${params}`)
      .then((p) => {
        setPagina(p);
        setErro('');
      })
      .catch((e: Error) => setErro(e.message));
  }, [eventoId, filtro, versao]);

  function buscar(e: FormEvent) {
    e.preventDefault();
    setFiltro({ ...filtro, busca: texto.trim(), pagina: 1 });
  }

  const meta = pagina?.paginacao;

  return (
    <section className="cartao tabela-cartao">
      <div className="tabela-topo">
        <h2>Participantes cadastrados{meta ? ` (${meta.totalItens})` : ''}</h2>
        <form className="filtros" onSubmit={buscar} role="search">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nome ou matrícula" aria-label="Buscar participante" />
          <select value={filtro.grupoId} onChange={(e) => setFiltro({ ...filtro, grupoId: e.target.value, pagina: 1 })} aria-label="Filtrar por grupo">
            <option value="">Todos os grupos</option>
            {grupos.map((g) => (
              <option key={g.id} value={g.id}>
                {g.nome}
              </option>
            ))}
          </select>
          <button className="btn btn-cinza">Buscar</button>
        </form>
      </div>

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      {pagina?.dados.length === 0 && <p className="dica">Nenhum participante encontrado.</p>}

      {!!pagina?.dados.length && (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Matrícula</th>
                <th>Nome</th>
                <th>Turma</th>
                <th>Grupo</th>
              </tr>
            </thead>
            <tbody>
              {pagina.dados.map((p) => (
                <tr key={p.id}>
                  <td>{p.matricula}</td>
                  <td>{p.nome}</td>
                  <td>{p.turma}</td>
                  <td>{p.grupo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPaginas > 1 && (
        <nav className="paginacao" aria-label="Páginas">
          <button className="btn btn-cinza" disabled={meta.pagina <= 1} onClick={() => setFiltro({ ...filtro, pagina: meta.pagina - 1 })}>
            Anterior
          </button>
          <span>
            Página {meta.pagina} de {meta.totalPaginas}
          </span>
          <button className="btn btn-cinza" disabled={meta.pagina >= meta.totalPaginas} onClick={() => setFiltro({ ...filtro, pagina: meta.pagina + 1 })}>
            Próxima
          </button>
        </nav>
      )}
    </section>
  );
}
