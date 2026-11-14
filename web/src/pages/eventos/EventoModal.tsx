import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, type Schemas } from '../../api/client';
import { diasNoPeriodo, planoDias, somarDias, validarDias } from './dias.ts';

type Evento = Schemas['EventoResumoDto'];
type Dia = Schemas['DiaEventoDto'];

const diaDaSemana = (data: string) =>
  data ? new Date(`${data}T00:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' }) : '';

/** Gera os dias contínuos a partir do início, preservando os que já existem quando `manter` é true. */
const ajustarDatas = (atuais: string[], inicio: string, quantidade: number, manter: boolean) =>
  Array.from({ length: Math.max(0, quantidade) }, (_, i) => (manter && atuais[i]) || (inicio ? somarDias(inicio, i) : ''));

type Props = { evento?: Evento; onFechar: () => void; onSalvo: () => void };

export default function EventoModal({ evento, onFechar, onSalvo }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  // Guarda o id quando o evento novo já foi criado mas os dias falharam: o próximo envio vira edição.
  const [eventoId, setEventoId] = useState(evento?.id);
  const [nome, setNome] = useState(evento?.nome ?? '');
  const [ano, setAno] = useState(() => evento?.ano ?? new Date().getFullYear());
  const [inicio, setInicio] = useState(evento?.dataInicio ?? '');
  const [fim, setFim] = useState(evento?.dataFim ?? '');
  const [quantidade, setQuantidade] = useState(evento?.quantidadeDias ?? 1);
  const [datas, setDatas] = useState<string[]>([]);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    dialogo.current?.showModal();
    if (!evento) return;
    api<Dia[]>(`/eventos/${evento.id}/dias`)
      .then((dias) => {
        const porNumero = Array.from({ length: evento.quantidadeDias }, (_, i) => dias.find((d) => d.numeroDia === i + 1)?.data ?? '');
        setDatas(porNumero);
      })
      .catch((e: Error) => setErro(e.message));
  }, [evento]);

  const limite = diasNoPeriodo(inicio, fim);

  function mudarInicio(valor: string) {
    setInicio(valor);
    setDatas(ajustarDatas(datas, valor, quantidade, false));
  }

  function mudarQuantidade(valor: number) {
    setQuantidade(valor);
    setDatas(ajustarDatas(datas, inicio, valor, true));
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const problema =
      (limite === 0 && 'A data final precisa ser igual ou posterior à inicial.') ||
      (quantidade > limite && `O período comporta no máximo ${limite} dia(s).`) ||
      validarDias(datas, inicio, fim);
    if (problema) return setErro(problema);

    setErro('');
    setSalvando(true);
    const dados = { nome: nome.trim(), ano, dataInicio: inicio, dataFim: fim, quantidadeDias: quantidade };
    try {
      let id = eventoId;
      const existentes = id ? await api<Dia[]>(`/eventos/${id}/dias`) : [];
      const plano = planoDias(existentes, datas);
      // Ordem exigida pelos gatilhos do banco: tira os dias que saem, ajusta o período, cria os que entram.
      for (const diaId of plano.excluir) await api(`/eventos/${id}/dias/${diaId}`, { method: 'DELETE' });
      if (id) {
        await api(`/eventos/${id}`, { method: 'PATCH', body: JSON.stringify(dados) });
      } else {
        id = (await api<Evento>('/eventos', { method: 'POST', body: JSON.stringify(dados) })).id;
        setEventoId(id);
      }
      for (const dia of plano.criar) await api(`/eventos/${id}/dias`, { method: 'POST', body: JSON.stringify(dia) });
      if (!evento) await api(`/eventos/${id}/ativar`, { method: 'POST' });
      onSalvo();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <dialog ref={dialogo} className="modal" onClose={onFechar} aria-labelledby="evento-titulo">
      <form onSubmit={salvar}>
        <header className="modal-topo">
          <h2 id="evento-titulo">{evento ? 'Editar evento' : '+ Cadastrar novo evento'}</h2>
          <button type="button" className="modal-fechar" onClick={onFechar} aria-label="Fechar">
            ×
          </button>
        </header>

        <div className="modal-corpo">
          <label className="campo">
            Nome do evento
            <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={100} placeholder="Arena Comp 2026" />
          </label>
          <label className="campo campo-curto">
            Ano de realização
            <input type="number" value={ano} onChange={(e) => setAno(e.target.valueAsNumber)} required min={2000} max={2100} />
          </label>
          <div className="linha">
            <label className="campo">
              Data inicial
              <input type="date" value={inicio} onChange={(e) => mudarInicio(e.target.value)} required />
            </label>
            <label className="campo">
              Data final
              <input type="date" value={fim} onChange={(e) => setFim(e.target.value)} min={inicio} required />
            </label>
          </div>
          <label className="campo campo-quantidade">
            Quantidade de dias
            <span>
              <input
                type="number"
                value={quantidade}
                onChange={(e) => mudarQuantidade(e.target.valueAsNumber || 1)}
                min={1}
                max={limite || undefined}
                required
              />
              dias de competição
            </span>
          </label>

          {datas.length > 0 && (
            <fieldset className="dias">
              <legend>Dias operacionais</legend>
              {datas.map((data, i) => (
                <label key={i} className="dia">
                  <span className="dia-numero">{i + 1}</span>
                  <span className="dia-texto">
                    <strong>Dia {i + 1}</strong>
                    <input
                      type="date"
                      value={data}
                      min={inicio}
                      max={fim}
                      onChange={(e) => setDatas(datas.map((d, j) => (j === i ? e.target.value : d)))}
                      aria-label={`Data do dia ${i + 1}`}
                    />
                    <small>{diaDaSemana(data)}</small>
                  </span>
                </label>
              ))}
            </fieldset>
          )}

          {erro && (
            <p className="erro" role="alert">
              {erro}
            </p>
          )}

          <div className="modal-acoes">
            <button type="button" className="btn btn-cinza" onClick={onFechar}>
              Cancelar
            </button>
            <button type="submit" className="btn" disabled={salvando}>
              {salvando ? 'Salvando...' : evento ? 'Salvar alterações' : '✓ Salvar e definir como ativo'}
            </button>
          </div>
        </div>
      </form>
    </dialog>
  );
}
