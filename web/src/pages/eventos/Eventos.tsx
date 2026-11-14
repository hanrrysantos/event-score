import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, type Schemas } from '../../api/client';
import { useLayout } from '../../components/Layout';
import EventoModal from './EventoModal';
import './Eventos.css';

type Evento = Schemas['EventoResumoDto'];

const formatarData = (data: string) => data.split('-').reverse().join('/');
// O código exibido é gerado a partir do id: a API não guarda código (contrato v0.3).
const codigo = (id: number) => `EVT-${String(id).padStart(2, '0')}`;

export default function Eventos() {
  const { recarregarEventoAtivo } = useLayout();
  const [eventos, setEventos] = useState<Evento[]>();
  const [erro, setErro] = useState('');
  const [ativando, setAtivando] = useState<number>();
  // undefined = fechado; null = novo evento; Evento = edição.
  const [modal, setModal] = useState<Evento | null>();

  const carregar = useCallback(() => {
    api<Evento[]>('/eventos')
      .then(setEventos)
      .catch((e: Error) => setErro(e.message));
  }, []);

  useEffect(carregar, [carregar]);

  async function ativar(id: number) {
    setErro('');
    setAtivando(id);
    try {
      await api(`/eventos/${id}/ativar`, { method: 'POST' });
      carregar();
      recarregarEventoAtivo();
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setAtivando(undefined);
    }
  }

  return (
    <>
      <header className="hero">
        <div>
          <h1>Eventos</h1>
          <p>Cadastre as edições e escolha qual está ativa. As demais telas usam o evento ativo.</p>
        </div>
        <button className="btn btn-claro" onClick={() => setModal(null)}>
          + Novo evento
        </button>
      </header>

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      <section className="cartao eventos" aria-busy={!eventos}>
        {!eventos && <p className="vazio">Carregando eventos...</p>}
        {eventos?.length === 0 && <p className="vazio">Nenhum evento cadastrado ainda.</p>}
        {eventos?.map((evento) => (
          <article key={evento.id} className={`evento${evento.ativo ? ' evento-ativo' : ''}`}>
            <span className="evento-codigo">{codigo(evento.id)}</span>
            <div className="evento-info">
              <strong>{evento.nome}</strong>
              <small>
                {formatarData(evento.dataInicio)} a {formatarData(evento.dataFim)} · {evento.quantidadeDias}{' '}
                {evento.quantidadeDias === 1 ? 'dia' : 'dias'}
              </small>
            </div>
            <label className="interruptor">
              <button
                type="button"
                role="switch"
                aria-checked={evento.ativo}
                disabled={evento.ativo || ativando !== undefined}
                onClick={() => ativar(evento.id)}
              />
              {evento.ativo ? 'Ativo' : 'Inativo'}
            </label>
            <div className="evento-acoes">
              <Link className="btn btn-contorno" to={`/evento/${evento.id}/configuracao`}>
                Configurar
              </Link>
              <button className="btn btn-contorno" onClick={() => setModal(evento)}>
                Editar
              </button>
            </div>
          </article>
        ))}
      </section>

      {modal !== undefined && (
        <EventoModal
          evento={modal ?? undefined}
          onFechar={() => setModal(undefined)}
          onSalvo={() => {
            setModal(undefined);
            carregar();
            recarregarEventoAtivo();
          }}
        />
      )}
    </>
  );
}
