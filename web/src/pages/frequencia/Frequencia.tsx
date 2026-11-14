import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api, ApiError, type Schemas } from '../../api/client';
import { useLayout } from '../../components/Layout';
import { iniciais } from '../../texto';
import { aplicarPendentes, diaInicial, filtrar, gravarPendentes, lerPendentes, resumo, type Pendentes, type Presenca } from './presencas.ts';
import './Frequencia.css';

type Dia = Schemas['DiaEventoDto'];
const formatarData = (data: string) => data.split('-').reverse().join('/');
const doisDigitos = (n: number) => String(n).padStart(2, '0');
const sem = (mapa: Pendentes, id: number) => {
  const copia = { ...mapa };
  delete copia[id];
  return copia;
};

// Cada marcação grava na hora (PUT idempotente), então o botão "Salvar frequência" e a coluna
// "Horário" do mock saíram. Não há marcação em lote: o RF07 proíbe.
export default function Frequencia() {
  const { eventoAtivo } = useLayout();
  const eventoId = eventoAtivo?.id;
  const [dias, setDias] = useState<Dia[]>();
  const [diaId, setDiaId] = useState<number>();
  // A lista guarda de qual dia ela é; ao trocar de dia, a anterior deixa de valer até a nova chegar.
  const [lista, setLista] = useState<{ diaId: number; dados: Presenca[] }>();
  const dados = lista && lista.diaId === diaId ? lista.dados : undefined;
  const mudarDados = (f: (d: Presenca[]) => Presenca[]) => setLista((l) => l && { ...l, dados: f(l.dados) });
  const [pendentes, setPendentes] = useState<Pendentes>({});
  const [salvando, setSalvando] = useState<Set<number>>(new Set());
  const [grupoId, setGrupoId] = useState('');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!eventoId) return;
    api<Dia[]>(`/eventos/${eventoId}/dias`)
      .then((lista) => {
        const ordenados = [...lista].sort((a, b) => a.numeroDia - b.numeroDia);
        setDias(ordenados);
        setDiaId(diaInicial(ordenados, new Date().toLocaleDateString('sv-SE'))?.id);
      })
      .catch((e: Error) => setErro(e.message));
  }, [eventoId]);

  useEffect(() => {
    if (!eventoId || !diaId) return;
    api<{ dados: Presenca[] }>(`/eventos/${eventoId}/dias/${diaId}/presencas`)
      .then((r) => {
        const guardadas = lerPendentes(eventoId, diaId);
        setPendentes(guardadas);
        setLista({ diaId, dados: aplicarPendentes(r.dados, guardadas) });
      })
      .catch((e: Error) => setErro(e.message));
  }, [eventoId, diaId]);

  const atualizarPendentes = useCallback(
    (mudar: (atual: Pendentes) => Pendentes) => {
      setPendentes((atual) => {
        const novo = mudar(atual);
        if (eventoId && diaId) gravarPendentes(eventoId, diaId, novo);
        return novo;
      });
    },
    [eventoId, diaId],
  );

  const enviar = useCallback(
    async (participanteId: number, presente: boolean) => {
      setSalvando((s) => new Set(s).add(participanteId));
      try {
        await api(`/eventos/${eventoId}/dias/${diaId}/presencas/${participanteId}`, {
          method: 'PUT',
          body: JSON.stringify({ presente }),
        });
        atualizarPendentes((atual) => sem(atual, participanteId));
        return true;
      } catch (e) {
        if (e instanceof ApiError && e.status === 0) {
          atualizarPendentes((atual) => ({ ...atual, [participanteId]: presente }));
        } else {
          // Recusa da API (ex.: participante de outro evento): desfaz a marcação e mostra o motivo.
          atualizarPendentes((atual) => sem(atual, participanteId));
          mudarDados((d) => d.map((p) => (p.participanteId === participanteId ? { ...p, presente: !presente } : p)));
          setErro((e as Error).message);
        }
        return false;
      } finally {
        setSalvando((s) => {
          const novo = new Set(s);
          novo.delete(participanteId);
          return novo;
        });
      }
    },
    [eventoId, diaId, atualizarPendentes],
  );

  const reenviar = useCallback(async () => {
    setErro('');
    for (const [id, presente] of Object.entries(pendentes)) await enviar(Number(id), presente);
  }, [pendentes, enviar]);

  // Volta a conexão: reenvia sozinho o que ficou pendente.
  useEffect(() => {
    window.addEventListener('online', reenviar);
    return () => window.removeEventListener('online', reenviar);
  }, [reenviar]);

  if (eventoAtivo === undefined) return <p className="cartao">Carregando...</p>;
  if (eventoAtivo === null) {
    return (
      <p className="cartao">
        Nenhum evento ativo. Ative um evento na aba <Link to="/evento">Evento</Link> para registrar a frequência.
      </p>
    );
  }

  function marcar(p: Presenca, presente: boolean) {
    setErro('');
    mudarDados((d) => d.map((x) => (x.participanteId === p.participanteId ? { ...x, presente } : x)));
    enviar(p.participanteId, presente);
  }

  const grupos = [...new Map((dados ?? []).map((p) => [p.grupoId, p.grupo])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const visiveis = dados ? filtrar(dados, grupoId, busca) : [];
  const contagem = resumo(visiveis);
  const pct = (n: number) => `${contagem.total ? (n / contagem.total) * 100 : 0}%`;
  const qtdPendentes = Object.keys(pendentes).length;

  return (
    <>
      <header className="hero">
        <div>
          <h1>Frequência diária</h1>
          <p>Marque quem esteve presente em cada dia. Cada marcação é salva na hora.</p>
        </div>
      </header>

      <div className="filtros-frequencia">
        <label className="campo">
          Dia
          <select value={diaId ?? ''} onChange={(e) => setDiaId(Number(e.target.value))} disabled={!dias?.length}>
            {dias?.map((d) => (
              <option key={d.id} value={d.id}>
                Dia {doisDigitos(d.numeroDia)} · {formatarData(d.data)}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Grupo
          <select value={grupoId} onChange={(e) => setGrupoId(e.target.value)}>
            <option value="">Todos</option>
            {grupos.map(([id, nome]) => (
              <option key={id} value={id}>
                {nome}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          Buscar aluno
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome ou matrícula" />
        </label>
      </div>

      {dias?.length === 0 && (
        <p className="cartao">
          O evento ainda não tem dias cadastrados. Cadastre-os na aba <Link to="/evento">Evento</Link>.
        </p>
      )}

      {qtdPendentes > 0 && (
        <div className="cartao pendentes" role="status">
          <span>
            {qtdPendentes === 1 ? '1 marcação ainda não foi salva' : `${qtdPendentes} marcações ainda não foram salvas`} por falta de conexão.
            Elas ficam guardadas neste navegador e são reenviadas quando a conexão voltar.
          </span>
          <button className="btn" onClick={reenviar} disabled={salvando.size > 0}>
            Reenviar agora
          </button>
        </div>
      )}

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      <div className="contagem contagem-3">
        <div className="cartao">
          <small>Total</small>
          <strong>{doisDigitos(contagem.total)}</strong>
        </div>
        <div className="cartao">
          <small>Presentes</small>
          <strong className="contagem-ok">{doisDigitos(contagem.presentes)}</strong>
          <span className="barra">
            <span style={{ width: pct(contagem.presentes) }} />
          </span>
        </div>
        <div className="cartao">
          <small>Ausentes</small>
          <strong className="contagem-erro">{doisDigitos(contagem.ausentes)}</strong>
          <span className="barra barra-erro">
            <span style={{ width: pct(contagem.ausentes) }} />
          </span>
        </div>
      </div>

      <section className="cartao tabela-cartao" aria-busy={!dados}>
        {!dados && diaId && <p className="dica">Carregando a lista do dia...</p>}
        {dados && visiveis.length === 0 && <p className="dica">Nenhum participante encontrado.</p>}
        {visiveis.length > 0 && (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Matrícula</th>
                  <th>Aluno</th>
                  <th>Grupo</th>
                  <th>Presente</th>
                </tr>
              </thead>
              <tbody>
                {visiveis.map((p) => (
                  <tr key={p.participanteId}>
                    <td>{p.matricula}</td>
                    <td>
                      <span className="pessoa">
                        <span className="avatar" aria-hidden="true">
                          {iniciais(p.nome)}
                        </span>
                        {p.nome}
                      </span>
                    </td>
                    <td>{p.grupo}</td>
                    <td>
                      <label className="presenca">
                        <input
                          type="checkbox"
                          checked={p.presente}
                          disabled={salvando.has(p.participanteId)}
                          onChange={(e) => marcar(p, e.target.checked)}
                          aria-label={`Presença de ${p.nome}`}
                        />
                        {p.participanteId in pendentes && <small className="nao-salvo">não salvo</small>}
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
