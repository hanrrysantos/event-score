import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet } from 'react-router';
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

export default function Layout() {
  const [eventoAtivo, setEventoAtivo] = useState<string>();
  const logado = Boolean(token.ler());

  useEffect(() => {
    if (!logado) return;
    // 404 = nenhum evento ativo; a marca volta para "EventScore".
    api<Schemas['EventoDetalheDto']>('/eventos/ativo')
      .then((evento) => setEventoAtivo(evento.nome))
      .catch(() => setEventoAtivo(undefined));
  }, [logado]);

  if (!logado) return <Navigate to="/login" replace />;

  function sair() {
    token.limpar();
    window.location.assign('/login');
  }

  return (
    <div className="pagina">
      <nav className="nav" aria-label="Seções">
        <span className="nav-marca">{eventoAtivo ?? 'EventScore'}</span>
        {ABAS.map(([rota, nome]) => (
          <NavLink key={rota} to={rota}>
            {nome}
          </NavLink>
        ))}
        <button type="button" onClick={sair}>
          Sair
        </button>
      </nav>
      <Outlet />
    </div>
  );
}
