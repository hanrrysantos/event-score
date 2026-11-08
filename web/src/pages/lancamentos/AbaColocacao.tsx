import { Fragment, useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import type { Desafio } from '../desafios/regras.ts';
import { PontoCor, type Grupo } from './comum';
import { corpoColocacoes, pontosDaColocacao, validarColocacoes, type Auditoria, type Resultado } from './regras.ts';

type Linha = { id: number | null; grupoId: number; colocacao: number | null; ausente: boolean };

const formatarDataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

/** Aba 1 (RF08, RF09): colocação de cada grupo no desafio, salva de uma vez com PUT idempotente. */
export default function AbaColocacao({ eventoId, grupos }: { eventoId: number; grupos: Grupo[] }) {
  const base = `/eventos/${eventoId}`;
  const [desafios, setDesafios] = useState<Desafio[]>();
  const [desafioId, setDesafioId] = useState<number>();
  const [linhas, setLinhas] = useState<{ desafioId: number; dados: Linha[] }>();
  const [historico, setHistorico] = useState<{ id: number; itens?: Auditoria[] }>();
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api<Desafio[]>(`${base}/desafios`)
      .then((lista) => {
        setDesafios(lista);
        setDesafioId((atual) => atual ?? lista[0]?.id);
      })
      .catch((e: Error) => setErro(e.message));
  }, [base]);

  useEffect(() => {
    if (!desafioId) return;
    api<Resultado[]>(`${base}/desafios/${desafioId}/resultados`)
      .then((resultados) =>
        setLinhas({
          desafioId,
          // Uma linha por grupo do evento, mesmo que a API ainda não tenha resultado para ele.
          dados: grupos.map((g) => {
            const r = resultados.find((x) => x.grupoId === g.id);
            return { id: r?.id ?? null, grupoId: g.id, colocacao: r?.colocacao ?? null, ausente: r?.ausente ?? false };
          }),
        }),
      )
      .catch((e: Error) => setErro(e.message));
  }, [base, desafioId, grupos]);

  const desafio = desafios?.find((d) => d.id === desafioId);
  const dados = linhas?.desafioId === desafioId ? linhas?.dados : undefined;
  const nome = (id: number) => grupos.find((g) => g.id === id)?.nome ?? `grupo ${id}`;
  const maximo = Math.max(1, ...(desafio?.pontosColocacao.map((p) => p.pontos) ?? []));

  function mudar(grupoId: number, valor: string) {
    setSalvo(false);
    setLinhas(
      (l) =>
        l && {
          ...l,
          dados: l.dados.map((x) =>
            x.grupoId !== grupoId ? x : valor === 'ausente' ? { ...x, ausente: true, colocacao: null } : { ...x, ausente: false, colocacao: valor ? Number(valor) : null },
          ),
        },
    );
  }

  async function salvar() {
    if (!dados || !desafioId) return;
    const problema = validarColocacoes(dados, nome);
    if (problema) return setErro(problema);
    setErro('');
    setSalvando(true);
    try {
      const resposta = await api<Resultado[] | undefined>(`${base}/desafios/${desafioId}/resultados`, {
        method: 'PUT',
        body: JSON.stringify(corpoColocacoes(dados)),
      });
      // O PUT mantém o id de cada linha; com ele o botão "Histórico" passa a funcionar.
      if (Array.isArray(resposta)) {
        setLinhas({ desafioId, dados: dados.map((l) => ({ ...l, id: resposta.find((r) => r.grupoId === l.grupoId)?.id ?? l.id })) });
      }
      setSalvo(true);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function verHistorico(id: number) {
    if (historico?.id === id) return setHistorico(undefined);
    setHistorico({ id });
    try {
      const itens = await api<Auditoria[]>(`/auditoria?entidade=RESULTADO_DESAFIO&registroId=${id}`);
      setHistorico({ id, itens });
    } catch (e) {
      setHistorico(undefined);
      setErro((e as Error).message);
    }
  }

  if (desafios?.length === 0) {
    return (
      <p className="cartao">
        Nenhum desafio cadastrado. Cadastre-os na aba <Link to="/desafios">Desafios</Link>.
      </p>
    );
  }

  return (
    <>
      <section className="cartao">
        <label className="campo">
          Desafio
          <select className="seletor" value={desafioId ?? ''} onChange={(e) => setDesafioId(Number(e.target.value))}>
            {desafios?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </label>
      </section>

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      {salvo && (
        <p className="sucesso" role="status">
          Colocações salvas. A classificação já considera este lançamento.
        </p>
      )}

      <section className="cartao tabela-cartao" aria-busy={!dados}>
        {!dados && <p className="dica">Carregando...</p>}
        {dados && (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Equipe</th>
                  <th>Colocação</th>
                  <th>Pontos</th>
                  <th>
                    <span className="sr-only">Histórico</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {dados.map((l) => {
                  const grupo = grupos.find((g) => g.id === l.grupoId);
                  const pontos = l.ausente ? null : pontosDaColocacao(l.colocacao, desafio?.pontosColocacao ?? []);
                  return (
                    <Fragment key={l.grupoId}>
                      <tr>
                        <td>
                          <span className="pessoa">
                            <PontoCor cor={grupo?.cor ?? '#999999'} />
                            {grupo?.nome}
                          </span>
                        </td>
                        <td>
                          <select
                            className={`seletor-colocacao${l.ausente ? ' ausente' : ''}`}
                            value={l.ausente ? 'ausente' : (l.colocacao ?? '')}
                            onChange={(e) => mudar(l.grupoId, e.target.value)}
                            aria-label={`Colocação de ${grupo?.nome}`}
                          >
                            <option value="">—</option>
                            {grupos.map((_, i) => (
                              <option key={i} value={i + 1}>
                                {i + 1}º
                              </option>
                            ))}
                            <option value="ausente">Ausente</option>
                          </select>
                        </td>
                        <td>
                          {pontos === null || l.colocacao === null ? (
                            '—'
                          ) : (
                            <span className="pontos-barra">
                              <strong>{pontos}</strong>
                              <span className="barra">
                                <span style={{ width: `${(pontos / maximo) * 100}%` }} />
                              </span>
                            </span>
                          )}
                        </td>
                        <td>
                          {l.id !== null && (
                            <button type="button" className="btn btn-contorno btn-pequeno" onClick={() => verHistorico(l.id!)} aria-expanded={historico?.id === l.id}>
                              Histórico
                            </button>
                          )}
                        </td>
                      </tr>
                      {historico?.id === l.id && l.id !== null && (
                        <tr className="historico">
                          <td colSpan={4}>
                            {!historico.itens && 'Carregando histórico...'}
                            {historico.itens?.length === 0 && 'Sem alterações registradas.'}
                            <ul>
                              {historico.itens?.map((h, i) => (
                                <li key={i}>
                                  {formatarDataHora(h.dataHora)} · {h.usuario} · {h.operacao}: {h.valorAnterior ?? '—'} → {h.valorNovo ?? '—'}
                                </li>
                              ))}
                            </ul>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="rodape-acao">
          <small>Grupo ausente recebe 0 ponto e não ocupa colocação (RF09).</small>
          <button className="btn" onClick={salvar} disabled={!dados || salvando}>
            {salvando ? 'Salvando...' : 'Salvar colocações'}
          </button>
        </div>
      </section>
    </>
  );
}
