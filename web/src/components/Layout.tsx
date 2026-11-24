import { useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useOutletContext } from 'react-router';
import { api, ApiError, token, type Schemas } from '../api/client';
import TelemetryTracker from './TelemetryTracker';

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
export type ContextoLayout = {
  eventoAtivo: Evento | null | undefined;
  recarregarEventoAtivo: () => void;
  perfil?: string;
};
export const useLayout = () => useOutletContext<ContextoLayout>();

export default function Layout() {
  const [eventoAtivo, setEventoAtivo] = useState<Evento | null>();
  const [usuario, setUsuario] = useState<{ nome: string; perfil: string }>();
  const logado = Boolean(token.ler());

  const [erroEvento, setErroEvento] = useState('');
  // Telas menores que a barra inteira: as abas ficam atrás do botão "Menu".
  const [menuAberto, setMenuAberto] = useState(false);
  const fecharMenu = () => setMenuAberto(false);

  const recarregarEventoAtivo = useCallback(() => {
    api<Evento>('/eventos/ativo')
      .then((evento) => {
        setEventoAtivo(evento);
        setErroEvento('');
      })
      .catch((e: Error) => {
        // Só o 404 significa "nenhum evento ativo"; queda de conexão ou erro do servidor não pode virar isso.
        if (e instanceof ApiError && e.status === 404) {
          setEventoAtivo(null);
          setErroEvento('');
        } else setErroEvento(e.message);
      });
  }, []);

  useEffect(() => {
    if (!logado) return;
    recarregarEventoAtivo();
    // Contrato v0.3: o cabeçalho mostra quem está logado (GET /auth/me). Token vencido cai no 401 do cliente.
    api<{ id: number; nome: string; email: string; perfil: string }>('/auth/me')
      .then((u) => setUsuario(u))
      .catch(() => setUsuario(undefined));
  }, [logado, recarregarEventoAtivo]);

  if (!logado) return <Navigate to="/login" replace />;

  async function sair() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* token local sempre é removido */
    }
    token.limpar();
    window.location.assign('/login');
  }

  return (
    <div className="pagina">
      <nav
        className={`nav${menuAberto ? ' nav-aberta' : ''}`}
        aria-label="Seções"
      >
        <span className="nav-marca">
          <img src="/logo-es.svg" alt="" />
          <span className="nav-evento">
            {eventoAtivo?.nome ?? 'EventScore'}
          </span>
        </span>
        <button
          type="button"
          className="nav-menu"
          aria-expanded={menuAberto}
          aria-controls="nav-itens"
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          {menuAberto ? 'Fechar' : 'Menu'}
        </button>
        <div id="nav-itens" className="nav-itens">
          {ABAS.map(([rota, nome]) => (
            <NavLink
              key={rota}
              to={rota}
              data-telemetry-action={`navigation.${rota.slice(1)}`}
              onClick={fecharMenu}
            >
              {nome}
            </NavLink>
          ))}
          {usuario?.perfil === 'MASTER' && (
            <NavLink
              to="/gestao"
              data-telemetry-action="navigation.gestao"
              onClick={fecharMenu}
            >
              Gestão
            </NavLink>
          )}
          {usuario && <span className="nav-usuario">{usuario.nome}</span>}
          <button
            type="button"
            data-telemetry-action="auth.logout"
            onClick={sair}
            aria-label={usuario ? `Sair (${usuario.nome})` : 'Sair'}
          >
            Sair
          </button>
        </div>
      </nav>
      {erroEvento && (
        <div className="cartao pendentes" role="alert">
          <span>Não foi possível carregar o evento ativo: {erroEvento}</span>
          <button type="button" className="btn" onClick={recarregarEventoAtivo}>
            Tentar de novo
          </button>
        </div>
      )}
      <Outlet
        context={
          {
            eventoAtivo,
            recarregarEventoAtivo,
            perfil: usuario?.perfil,
          } satisfies ContextoLayout
        }
      />
      <TelemetryTracker />
    </div>
  );
}
