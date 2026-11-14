import { useCallback, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useOutletContext } from 'react-router';
import { api, ApiError, token, type Schemas } from '../api/client';

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
  const [usuario, setUsuario] = useState<string>();
  const logado = Boolean(token.ler());

  const [erroEvento, setErroEvento] = useState('');

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
    api<Schemas['UsuarioResumoDto']>('/auth/me')
      .then((u) => setUsuario(u.nome))
      .catch(() => setUsuario(undefined));
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
        {usuario && <span className="nav-usuario">{usuario}</span>}
        <button type="button" onClick={sair} aria-label={usuario ? `Sair (${usuario})` : 'Sair'}>
          Sair
        </button>
      </nav>
      {erroEvento && (
        <div className="cartao pendentes" role="alert">
          <span>Não foi possível carregar o evento ativo: {erroEvento}</span>
          <button type="button" className="btn" onClick={recarregarEventoAtivo}>
            Tentar de novo
          </button>
        </div>
      )}
      <Outlet context={{ eventoAtivo, recarregarEventoAtivo } satisfies ContextoLayout} />
    </div>
  );
}
