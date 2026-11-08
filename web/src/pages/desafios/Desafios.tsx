import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, type Schemas } from '../../api/client';
import { useLayout } from '../../components/Layout';
import { montarDesafio, paraFormulario, type Desafio, type FormDesafio } from './regras.ts';
import './Desafios.css';

type Dia = Schemas['DiaEventoDto'];

const formatarData = (data: string) => data.split('-').reverse().join('/');

// "Critério de avaliação", "Peso" e o status "Validado" do mock saíram: a comissão apura o desafio fora
// do sistema e só a colocação entra (contrato v0.3). A data virou a escolha de um dos dias do evento (RF05).
export default function Desafios() {
  const { eventoAtivo } = useLayout();
  const [desafios, setDesafios] = useState<Desafio[]>();
  const [dias, setDias] = useState<Dia[]>([]);
  const [grupos, setGrupos] = useState(0);
  const [editando, setEditando] = useState<Desafio>();
  const [form, setForm] = useState<FormDesafio>(paraFormulario(undefined, 0));
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const base = eventoAtivo ? `/eventos/${eventoAtivo.id}` : '';

  const carregar = useCallback(() => {
    if (!base) return;
    Promise.all([api<Desafio[]>(`${base}/desafios`), api<Dia[]>(`${base}/dias`), api<Schemas['GrupoResumoDto'][]>(`${base}/grupos`)])
      .then(([lista, ds, gs]) => {
        setDesafios(lista);
        setDias([...ds].sort((a, b) => a.numeroDia - b.numeroDia));
        setGrupos(gs.length);
        setForm((f) => ({ ...f, pontos: Array.from({ length: gs.length }, (_, i) => f.pontos[i] ?? '') }));
      })
      .catch((e: Error) => setErro(e.message));
  }, [base]);

  useEffect(carregar, [carregar]);

  if (eventoAtivo === undefined) return <p className="cartao">Carregando...</p>;
  if (eventoAtivo === null) {
    return (
      <p className="cartao">
        Nenhum evento ativo. Ative um evento na aba <Link to="/evento">Evento</Link> para cadastrar os desafios.
      </p>
    );
  }

  const nomeDoDia = (diaId: number) => {
    const dia = dias.find((d) => d.id === diaId);
    return dia ? `Dia ${dia.numeroDia} · ${formatarData(dia.data)}` : '—';
  };
  const valores = form.pontos.map((t) => Number(t.replace(',', '.')) || 0);
  const maximo = Math.max(1, ...valores);
  const total = valores.reduce((a, b) => a + b, 0);

  function novo() {
    setEditando(undefined);
    setForm(paraFormulario(undefined, grupos));
    setErro('');
  }

  function editar(desafio: Desafio) {
    setEditando(desafio);
    setForm(paraFormulario(desafio, grupos));
    setErro('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    const resultado = montarDesafio(form, grupos);
    if ('erro' in resultado) return setErro(resultado.erro);
    setErro('');
    setSalvando(true);
    try {
      const corpo = JSON.stringify(resultado.dados);
      if (editando) await api(`${base}/desafios/${editando.id}`, { method: 'PATCH', body: corpo });
      else await api(`${base}/desafios`, { method: 'POST', body: corpo });
      novo();
      carregar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(desafio: Desafio) {
    if (!window.confirm(`Excluir o desafio "${desafio.nome}"? Essa ação não pode ser desfeita.`)) return;
    setErro('');
    try {
      await api(`${base}/desafios/${desafio.id}`, { method: 'DELETE' });
      if (editando?.id === desafio.id) novo();
      carregar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <>
      <header className="hero">
        <div>
          <h1>Desafios</h1>
          <p>Cadastre cada desafio e os pontos por colocação.</p>
        </div>
        <button className="btn btn-claro" onClick={novo}>
          Novo desafio
        </button>
      </header>

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      <form className="desafio-form" onSubmit={salvar}>
        <section className="cartao desafio-bloco">
          <h2>
            <span className="icone" aria-hidden="true">
              ⚑
            </span>
            {editando ? `Editar ${editando.nome}` : 'Dados do desafio'}
          </h2>
          <label className="campo">
            Nome
            <input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} required placeholder="Ex.: Hackathon" />
          </label>
          <label className="campo">
            Descrição
            <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Opcional" />
          </label>
          <label className="campo">
            Dia
            <select value={form.diaId} onChange={(e) => setForm({ ...form, diaId: e.target.value })} required>
              <option value="">Escolha o dia</option>
              {dias.map((d) => (
                <option key={d.id} value={d.id}>
                  Dia {d.numeroDia} · {formatarData(d.data)}
                </option>
              ))}
            </select>
          </label>
          {dias.length === 0 && <p className="dica">O evento ainda não tem dias cadastrados.</p>}
          <div className="desafio-acoes">
            <button className="btn" disabled={salvando}>
              {salvando ? 'Salvando...' : 'Salvar desafio'}
            </button>
            {editando && (
              <button type="button" className="btn btn-cinza" onClick={novo}>
                Cancelar
              </button>
            )}
          </div>
        </section>

        <section className="cartao desafio-bloco">
          <h2>
            <span className="icone" aria-hidden="true">
              1º
            </span>
            Pontos por colocação
          </h2>
          {grupos === 0 ? (
            <p className="dica">
              Cadastre os <Link to="/grupos">grupos</Link> antes: a tabela tem uma linha por grupo.
            </p>
          ) : (
            <table className="tabela pontos">
              <thead>
                <tr>
                  <th>Colocação</th>
                  <th aria-hidden="true" />
                  <th>Pontos</th>
                </tr>
              </thead>
              <tbody>
                {form.pontos.map((valor, i) => (
                  <tr key={i}>
                    <td>{i + 1}º</td>
                    <td aria-hidden="true">
                      <span className="barra">
                        <span style={{ width: `${(valores[i] / maximo) * 100}%` }} />
                      </span>
                    </td>
                    <td>
                      <input
                        inputMode="numeric"
                        value={valor}
                        onChange={(e) => setForm({ ...form, pontos: form.pontos.map((v, j) => (j === i ? e.target.value : v)) })}
                        aria-label={`Pontos do ${i + 1}º lugar`}
                      />{' '}
                      pts
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {grupos > 0 && <small className="dica">Total: {total} pts</small>}
        </section>
      </form>

      <section className="cartao tabela-cartao">
        <h2 className="titulo-bloco">
          <span className="icone" aria-hidden="true">
            ☰
          </span>
          Desafios cadastrados
        </h2>
        {desafios?.length === 0 && <p className="dica">Nenhum desafio cadastrado ainda.</p>}
        {!!desafios?.length && (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Desafio</th>
                  <th>Dia</th>
                  <th>Pontuação máxima</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {desafios.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <strong>{d.nome}</strong>
                      {d.descricao && <small className="desafio-descricao">{d.descricao}</small>}
                    </td>
                    <td>{nomeDoDia(d.diaId)}</td>
                    <td>{Math.max(0, ...d.pontosColocacao.map((p) => p.pontos))} pts</td>
                    <td className="desafio-linha-acoes">
                      <button className="btn btn-contorno" onClick={() => editar(d)}>
                        ✎ Editar
                      </button>
                      <button className="btn-excluir" onClick={() => excluir(d)} aria-label={`Excluir ${d.nome}`}>
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                          <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                        </svg>
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
