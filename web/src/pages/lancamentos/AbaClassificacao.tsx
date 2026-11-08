import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { api } from '../../api/client';
import { PontoCor } from './comum';
import { posicoesDesempate, type Classificacao, type LinhaClassificacao } from './regras.ts';

/** Aba 3 (RF12 a RF14): classificação calculada pela API; o desempate manual só aparece quando os critérios não resolvem. */
export default function AbaClassificacao({ eventoId }: { eventoId: number }) {
  const base = `/eventos/${eventoId}`;
  const [classificacao, setClassificacao] = useState<Classificacao>();
  const [erro, setErro] = useState('');

  const carregar = useCallback(() => {
    api<Classificacao>(`${base}/classificacao`)
      .then(setClassificacao)
      .catch((e: Error) => setErro(e.message));
  }, [base]);

  useEffect(carregar, [carregar]);

  if (!classificacao) return erro ? <p className="erro">{erro}</p> : <p className="cartao">Carregando...</p>;
  const { dados, resumo } = classificacao;

  return (
    <>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      <section className="cartao tabela-cartao">
        <div className="tabela-topo">
          <h2 className="titulo-bloco">Classificação</h2>
          <small className="dica">
            {resumo.desafiosLancados} de {resumo.desafiosTotais} desafios lançados
          </small>
        </div>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                <th>Posição</th>
                <th>Equipe</th>
                <th>Desafios</th>
                <th>Bônus</th>
                <th>Penalidade</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {dados.map((l) => (
                <tr key={l.grupoId}>
                  <td>
                    <strong>{l.posicao}º</strong> {l.empatado && <span className="selo selo-erro">Empate</span>}
                  </td>
                  <td>
                    <span className="pessoa">
                      <PontoCor cor={l.cor} />
                      {l.grupo}
                    </span>
                  </td>
                  <td>{l.pontosDesafios}</td>
                  <td>{l.bonificacao ? `+${l.bonificacao}` : 0}</td>
                  <td>{l.penalidade ? `−${l.penalidade}` : 0}</td>
                  <td>
                    <strong>{l.total}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {resumo.empatesPendentes.map((grupoIds) => (
        <Desempate key={grupoIds.join('-')} base={base} grupos={dados.filter((l) => grupoIds.includes(l.grupoId))} onSalvo={carregar} />
      ))}
    </>
  );
}

function Desempate({ base, grupos, onSalvo }: { base: string; grupos: LinhaClassificacao[]; onSalvo: () => void }) {
  const [ordem, setOrdem] = useState(grupos.map((g) => g.grupoId));
  const [justificativa, setJustificativa] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const posicaoInicial = Math.min(...grupos.map((g) => g.posicao));
  const nome = (id: number) => grupos.find((g) => g.grupoId === id)?.grupo ?? '';

  function mover(de: number, para: number) {
    const nova = [...ordem];
    [nova[de], nova[para]] = [nova[para], nova[de]];
    setOrdem(nova);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!justificativa.trim()) return setErro('A justificativa é obrigatória.');
    setErro('');
    setSalvando(true);
    try {
      await api(`${base}/desempates`, {
        method: 'POST',
        body: JSON.stringify({ posicoes: posicoesDesempate(ordem, posicaoInicial), justificativa: justificativa.trim() }),
      });
      onSalvo();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form className="cartao desempate" onSubmit={salvar}>
      <h2 className="titulo-bloco">Empate no {posicaoInicial}º lugar</h2>
      <p className="dica">
        Os critérios configurados não resolveram. Defina a ordem final; o responsável e a data são registrados pela API (RF14).
      </p>
      <ol className="criterios">
        {ordem.map((grupoId, i) => (
          <li key={grupoId} className="criterio">
            <span className="criterio-ordem">{posicaoInicial + i}º</span>
            <span>{nome(grupoId)}</span>
            <span className="criterio-acoes">
              <button type="button" className="btn-icone" disabled={i === 0} onClick={() => mover(i, i - 1)} aria-label={`Subir ${nome(grupoId)}`}>
                ↑
              </button>
              <button type="button" className="btn-icone" disabled={i === ordem.length - 1} onClick={() => mover(i, i + 1)} aria-label={`Descer ${nome(grupoId)}`}>
                ↓
              </button>
            </span>
          </li>
        ))}
      </ol>
      <label className="campo">
        Justificativa
        <textarea className="area-texto" value={justificativa} onChange={(e) => setJustificativa(e.target.value)} rows={3} required />
      </label>
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      <div>
        <button className="btn" disabled={salvando}>
          {salvando ? 'Registrando...' : 'Registrar desempate'}
        </button>
      </div>
    </form>
  );
}
