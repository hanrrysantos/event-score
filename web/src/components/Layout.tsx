import { useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useOutletContext } from 'react-router';
import { api, token, type Schemas } from '../api/client';

const ABAS = [
  ['/evento', 'Evento'],
  ['/grupos', 'Grupos'],
  ['/desafios', 'Desafios'],
  ['/participantes', 'Participantes'],
  ['/apuracao', 'Apuração'],
  ['/frequencia', 'Frequência'],
  ['/lancamentos', 'Lançamentos'],
  ['/relatorios', 'Relatórios'],
] as const;

type Evento = Schemas['EventoResumoDto'];

/** undefined = carregando; null = nenhum evento ativo. */
export type ContextoLayout = { eventoAtivo: Evento | null | undefined; recarregarEventoAtivo: () => void };
export const useLayout = () => useOutletContext<ContextoLayout>();

export default function Layout() {
  const [eventoAtivo, setEventoAtivo] = useState<Evento | null>();
  const logado = Boolean(token.ler());

  const recarregarEventoAtivo = useCallback(() => {
    // 404 = nenhum evento ativo.
    api<Evento>('/eventos/ativo')
      .then(setEventoAtivo)
      .catch(() => setEventoAtivo(null));
  }, []);

  useEffect(() => {
    if (logado) recarregarEventoAtivo();
  }, [logado, recarregarEventoAtivo]);

  if (!logado) return <Navigate to="/login" replace />;

  function sair() {
    token.limpar();
    window.location.assign('/login');
  }

  return (
    <div className="pagina">
      <nav className="nav" aria-label="Seções">
        <span className="nav-marca">{eventoAtivo?.nome ?? 'EventScore'}</span>
        {ABAS.map(([rota, nome]) => (
          <NavLink key={rota} to={rota}>
            {nome}
          </NavLink>
        ))}
        <button type="button" onClick={sair}>
          Sair
        </button>
      </nav>
      <Outlet context={{ eventoAtivo, recarregarEventoAtivo } satisfies ContextoLayout} />
    </div>
  );
}
