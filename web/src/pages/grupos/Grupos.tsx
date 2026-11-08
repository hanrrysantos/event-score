import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, type Schemas } from '../../api/client';
import { useLayout } from '../../components/Layout';
import { iniciais } from '../../texto';
import './Grupos.css';

type Grupo = Schemas['GrupoResumoDto'];

// Paleta do mock; "Outra cor" abre o seletor nativo, porque a quantidade de grupos é livre e a cor é única no evento.
const PALETA = ['#C0392B', '#1D4ED8', '#15803D', '#B7791F', '#6B46C1', '#18181B'];

// Texto preto em cores claras, branco nas escuras.
const corDoTexto = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? '#000000' : '#ffffff';
};

export default function Grupos() {
  const { eventoAtivo } = useLayout();
  const [grupos, setGrupos] = useState<Grupo[]>();
  const [travado, setTravado] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState<Grupo>();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(PALETA[0]);

  const base = eventoAtivo ? `/eventos/${eventoAtivo.id}` : '';

  const carregar = useCallback(() => {
    if (!base) return;
    api<Grupo[]>(`${base}/grupos`)
      .then((lista) => {
        setGrupos(lista);
        // Sugere a primeira cor da paleta ainda livre.
        const usadas = new Set(lista.map((g) => g.cor.toUpperCase()));
        setCor((atual) => (usadas.has(atual) ? (PALETA.find((c) => !usadas.has(c)) ?? '#808080') : atual));
      })
      .catch((e: Error) => setErro(e.message));
    // RF03: com resultado lançado, grupos não podem mais ser criados, editados nem excluídos.
    api<Schemas['EventoDetalheDto']>(base)
      .then((evento) => setTravado(evento.temResultado))
      .catch(() => {});
  }, [base]);

  useEffect(carregar, [carregar]);

  if (eventoAtivo === undefined) return <p className="cartao">Carregando...</p>;
  if (eventoAtivo === null) {
    return (
      <p className="cartao">
        Nenhum evento ativo. Ative um evento na aba <Link to="/evento">Evento</Link> para cadastrar os grupos.
      </p>
    );
  }

  const usadas = new Set(grupos?.filter((g) => g.id !== editando?.id).map((g) => g.cor.toUpperCase()));
  const participantes = grupos?.reduce((soma, g) => soma + g.quantidadeParticipantes, 0) ?? 0;

  function limpar() {
    setEditando(undefined);
    setNome('');
    setCor(PALETA.find((c) => !usadas.has(c)) ?? PALETA[0]);
  }

  function editar(grupo: Grupo) {
    setEditando(grupo);
    setNome(grupo.nome);
    setCor(grupo.cor.toUpperCase());
    setErro('');
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setSalvando(true);
    try {
      const corpo = JSON.stringify({ nome: nome.trim(), cor });
      if (editando) await api(`${base}/grupos/${editando.id}`, { method: 'PATCH', body: corpo });
      else await api(`${base}/grupos`, { method: 'POST', body: corpo });
      limpar();
      carregar();
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir(grupo: Grupo) {
    if (!window.confirm(`Excluir o grupo "${grupo.nome}"? Essa ação não pode ser desfeita.`)) return;
    setErro('');
    try {
      await api(`${base}/grupos/${grupo.id}`, { method: 'DELETE' });
      if (editando?.id === grupo.id) limpar();
      carregar();
    } catch (err) {
      setErro((err as Error).message);
    }
  }

  return (
    <>
      <header className="hero">
        <div>
          <h1>Grupos</h1>
          <p>
            {grupos
              ? `${grupos.length} ${grupos.length === 1 ? 'grupo' : 'grupos'} · ${participantes} participantes`
              : 'Carregando...'}
          </p>
        </div>
      </header>

      {travado ? (
        <p className="cartao aviso">
          Este evento já tem resultado lançado. Os grupos não podem mais ser criados, editados nem excluídos (RF03).
        </p>
      ) : (
        <form className="cartao grupo-form" onSubmit={salvar}>
          <h2>
            <span className="icone">{editando ? '✎' : '+'}</span> {editando ? `Editar ${editando.nome}` : 'Novo grupo'}
          </h2>
          <div className="grupo-form-linha">
            <label className="campo">
              Nome do grupo
              <input value={nome} onChange={(e) => setNome(e.target.value)} required maxLength={50} placeholder="Ex.: Alpha Red" />
            </label>
            <fieldset className="cores">
              <legend className="sr-only">Cor do grupo</legend>
              {PALETA.map((c) => (
                <label key={c} className="cor" style={{ background: c }} title={usadas.has(c) ? 'Cor já usada' : c}>
                  <input
                    type="radio"
                    name="cor"
                    value={c}
                    checked={cor === c}
                    disabled={usadas.has(c)}
                    onChange={() => setCor(c)}
                    aria-label={`Cor ${c}`}
                  />
                </label>
              ))}
              <label className="cor cor-outra" title="Outra cor" style={PALETA.includes(cor) ? undefined : { background: cor }}>
                <input type="color" value={cor} onChange={(e) => setCor(e.target.value.toUpperCase())} aria-label="Outra cor" />
              </label>
            </fieldset>
            <div className="grupo-form-acoes">
              {editando && (
                <button type="button" className="btn btn-cinza" onClick={limpar}>
                  Cancelar
                </button>
              )}
              <button className="btn" disabled={salvando || usadas.has(cor)}>
                {salvando ? 'Salvando...' : editando ? 'Salvar grupo' : 'Cadastrar grupo'}
              </button>
            </div>
          </div>
          {usadas.has(cor) && <p className="erro">Essa cor já é de outro grupo do evento.</p>}
        </form>
      )}

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      {grupos?.length === 0 && <p className="cartao">Nenhum grupo cadastrado ainda.</p>}
      <section className="grupos">
        {grupos?.map((grupo) => (
          <article key={grupo.id} className="cartao grupo">
            <div className="grupo-faixa" style={{ background: grupo.cor, color: corDoTexto(grupo.cor) }}>
              {iniciais(grupo.nome)}
            </div>
            <div className="grupo-info">
              <strong>{grupo.nome}</strong>
              <small>
                {grupo.quantidadeParticipantes} {grupo.quantidadeParticipantes === 1 ? 'integrante' : 'integrantes'}
              </small>
            </div>
            {!travado && (
              <div className="grupo-acoes">
                <button className="btn btn-contorno" onClick={() => editar(grupo)}>
                  ✎ Editar
                </button>
                <button className="btn-excluir" onClick={() => excluir(grupo)} aria-label={`Excluir ${grupo.nome}`}>
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
                  </svg>
                </button>
              </div>
            )}
          </article>
        ))}
      </section>
    </>
  );
}
