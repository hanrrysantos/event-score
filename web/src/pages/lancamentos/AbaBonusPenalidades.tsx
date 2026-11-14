import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import type { Configuracao } from '../configuracao/regras.ts';
import { PontoCor, type Grupo } from './comum';
import { montarBonificacao, montarPenalidade, type Bonificacao, type Penalidade } from './regras.ts';

const PENALIDADE_VAZIA = { grupoId: '', pontos: '', descricao: '', justificativa: '' };

/** Aba 2 (RF10, RF11): bonificação por item com teto e penalidade com justificativa. */
export default function AbaBonusPenalidades({ eventoId, grupos }: { eventoId: number; grupos: Grupo[] }) {
  const base = `/eventos/${eventoId}`;
  const [config, setConfig] = useState<Configuracao>();
  // Valor digitado por grupo e item: grupoId -> itemBonificacaoId -> texto.
  const [bonus, setBonus] = useState<Record<number, Record<number, string>>>({});
  const [penalidades, setPenalidades] = useState<Penalidade[]>();
  const [penalidade, setPenalidade] = useState(PENALIDADE_VAZIA);
  const [editando, setEditando] = useState<Penalidade>();
  const [ocupado, setOcupado] = useState<string>();
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'sucesso'; texto: string }>();

  const carregar = useCallback(() => {
    Promise.all([api<Configuracao>(`${base}/configuracao`), api<Bonificacao[]>(`${base}/bonificacoes`), api<Penalidade[]>(`${base}/penalidades`)])
      .then(([cfg, bonificacoes, pens]) => {
        setConfig(cfg);
        setBonus(Object.fromEntries(bonificacoes.map((b) => [b.grupoId, Object.fromEntries(b.itens.map((i) => [i.itemBonificacaoId, String(i.valor)]))])));
        setPenalidades(pens);
      })
      .catch((e: Error) => setAviso({ tipo: 'erro', texto: e.message }));
  }, [base]);

  useEffect(carregar, [carregar]);

  if (!config) return aviso ? <p className="erro">{aviso.texto}</p> : <p className="cartao">Carregando...</p>;

  const nome = (id: number) => grupos.find((g) => g.id === id)?.nome ?? `grupo ${id}`;
  const totalBonus = (grupoId: number) =>
    config.itensBonificacao.reduce((soma, item) => soma + (Number(bonus[grupoId]?.[item.id ?? -1]) || 0), 0);

  async function registrarBonus(grupoId: number) {
    const resultado = montarBonificacao(bonus[grupoId] ?? {}, config!.itensBonificacao);
    if ('erro' in resultado) return setAviso({ tipo: 'erro', texto: `${nome(grupoId)} · ${resultado.erro}` });
    setOcupado(`bonus-${grupoId}`);
    try {
      await api(`${base}/bonificacoes/${grupoId}`, { method: 'PUT', body: JSON.stringify(resultado.dados) });
      setAviso({ tipo: 'sucesso', texto: `Bônus de ${nome(grupoId)} registrado.` });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setOcupado(undefined);
    }
  }

  async function salvarPenalidade(e: FormEvent) {
    e.preventDefault();
    const resultado = montarPenalidade(penalidade, config!.penalidadeMin, config!.penalidadeMax);
    if ('erro' in resultado) return setAviso({ tipo: 'erro', texto: resultado.erro });
    setOcupado('penalidade');
    try {
      const corpo = JSON.stringify(resultado.dados);
      if (editando) await api(`${base}/penalidades/${editando.id}`, { method: 'PATCH', body: corpo });
      else await api(`${base}/penalidades`, { method: 'POST', body: corpo });
      setAviso({ tipo: 'sucesso', texto: editando ? 'Penalidade corrigida.' : `Penalidade aplicada a ${nome(resultado.dados.grupoId)}.` });
      cancelarEdicao();
      carregar();
    } catch (err) {
      setAviso({ tipo: 'erro', texto: (err as Error).message });
    } finally {
      setOcupado(undefined);
    }
  }

  function editar(p: Penalidade) {
    setEditando(p);
    setPenalidade({ grupoId: String(p.grupoId), pontos: String(p.pontos), descricao: p.descricao, justificativa: p.justificativa });
    setAviso(undefined);
  }

  function cancelarEdicao() {
    setEditando(undefined);
    setPenalidade(PENALIDADE_VAZIA);
  }

  async function remover(p: Penalidade) {
    if (!window.confirm(`Remover a penalidade de ${p.pontos} pontos de ${nome(p.grupoId)}?`)) return;
    try {
      await api(`${base}/penalidades/${p.id}`, { method: 'DELETE' });
      if (editando?.id === p.id) cancelarEdicao();
      setAviso({ tipo: 'sucesso', texto: 'Penalidade removida.' });
      carregar();
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    }
  }

  return (
    <>
      {aviso && (
        <p className={aviso.tipo} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      )}

      <section className="cartao tabela-cartao">
        <h2 className="titulo-bloco">Bonificação por grupo</h2>
        {config.itensBonificacao.length === 0 ? (
          <p className="dica">
            Nenhum item de bonificação configurado. Cadastre-os em <Link to={`/evento/${eventoId}/configuracao`}>Configuração do evento</Link>.
          </p>
        ) : (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Equipe</th>
                  {config.itensBonificacao.map((item) => (
                    <th key={item.id}>
                      {item.nome} (até {item.teto})
                    </th>
                  ))}
                  <th>Total</th>
                  <th>
                    <span className="sr-only">Ação</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {grupos.map((g) => (
                  <tr key={g.id}>
                    <td>
                      <span className="pessoa">
                        <PontoCor cor={g.cor} />
                        {g.nome}
                      </span>
                    </td>
                    {config.itensBonificacao.map((item) => (
                      <td key={item.id}>
                        <input
                          className="campo-tabela"
                          inputMode="numeric"
                          value={bonus[g.id]?.[item.id ?? -1] ?? ''}
                          onChange={(e) => setBonus({ ...bonus, [g.id]: { ...bonus[g.id], [item.id ?? -1]: e.target.value } })}
                          aria-label={`${item.nome} de ${g.nome}`}
                        />
                      </td>
                    ))}
                    <td>
                      <strong>{totalBonus(g.id)}</strong>
                    </td>
                    <td>
                      <button className="btn btn-pequeno" onClick={() => registrarBonus(g.id)} disabled={ocupado === `bonus-${g.id}`}>
                        Registrar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <form className="cartao penalidade-form" onSubmit={salvarPenalidade}>
        <h2 className="titulo-bloco">{editando ? `Corrigir penalidade de ${nome(editando.grupoId)}` : 'Aplicar penalidade'}</h2>
        <p className="dica">
          Entre {config.penalidadeMin} e {config.penalidadeMax} pontos, com justificativa obrigatória.
        </p>
        <div className="linha">
          <label className="campo">
            Equipe
            <select className="seletor" value={penalidade.grupoId} onChange={(e) => setPenalidade({ ...penalidade, grupoId: e.target.value })} required>
              <option value="">Escolha</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            Pontos
            <input inputMode="numeric" value={penalidade.pontos} onChange={(e) => setPenalidade({ ...penalidade, pontos: e.target.value })} required />
          </label>
        </div>
        <label className="campo">
          Descrição
          <input value={penalidade.descricao} onChange={(e) => setPenalidade({ ...penalidade, descricao: e.target.value })} required placeholder="Ex.: Atraso na entrega" />
        </label>
        <label className="campo">
          Justificativa
          <textarea
            className="area-texto"
            value={penalidade.justificativa}
            onChange={(e) => setPenalidade({ ...penalidade, justificativa: e.target.value })}
            required
            rows={3}
          />
        </label>
        <div className="desafio-acoes">
          <button className="btn" disabled={ocupado === 'penalidade'}>
            {editando ? 'Salvar correção' : 'Aplicar penalidade'}
          </button>
          {editando && (
            <button type="button" className="btn btn-cinza" onClick={cancelarEdicao}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      <section className="cartao tabela-cartao">
        <h2 className="titulo-bloco">Penalidades aplicadas</h2>
        {penalidades?.length === 0 && <p className="dica">Nenhuma penalidade aplicada.</p>}
        {!!penalidades?.length && (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Equipe</th>
                  <th>Pontos</th>
                  <th>Descrição</th>
                  <th>Justificativa</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {penalidades.map((p) => (
                  <tr key={p.id}>
                    <td>{nome(p.grupoId)}</td>
                    <td>−{p.pontos}</td>
                    <td>{p.descricao}</td>
                    <td>{p.justificativa}</td>
                    <td className="desafio-linha-acoes">
                      <button className="btn btn-contorno btn-pequeno" onClick={() => editar(p)}>
                        Corrigir
                      </button>
                      <button className="btn-excluir" onClick={() => remover(p)} aria-label={`Remover penalidade de ${nome(p.grupoId)}`}>
                        ×
                      </button>
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
