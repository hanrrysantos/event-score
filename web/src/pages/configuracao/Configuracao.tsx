import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useParams } from 'react-router';
import { api, type Schemas } from '../../api/client';
import { criteriosValidos, montarConfiguracao, paraFormulario, TIPOS_CRITERIO, type Configuracao as Config, type Formulario, type TipoCriterio } from './regras.ts';
import './Configuracao.css';

type Desafio = { id: number; nome: string };

// "Restaurar padrões" do mock saiu: pelo RNF06 não existe valor padrão fixado em código.
export default function Configuracao() {
  const { eventoId } = useParams();
  const base = `/eventos/${eventoId}`;
  const [evento, setEvento] = useState<Schemas['EventoDetalheDto']>();
  const [desafios, setDesafios] = useState<Desafio[]>([]);
  const [form, setForm] = useState<Formulario>();
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [descartados, setDescartados] = useState(0);

  useEffect(() => {
    Promise.all([
      api<Schemas['EventoDetalheDto']>(base),
      api<Schemas['GrupoResumoDto'][]>(`${base}/grupos`),
      api<Desafio[]>(`${base}/desafios`),
      api<Config>(`${base}/configuracao`),
    ])
      .then(([ev, grupos, des, config]) => {
        setEvento(ev);
        setDesafios(des);
        setForm(paraFormulario(config, grupos.length, ev.quantidadeDias));
        setDescartados(config.criteriosDesempate.length - criteriosValidos(config).length);
      })
      .catch((e: Error) => setErro(e.message));
  }, [base]);

  function mudar(parcial: Partial<Formulario>) {
    setForm((atual) => atual && { ...atual, ...parcial });
    setSalvo(false);
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    const resultado = montarConfiguracao(form, desafios);
    if ('erro' in resultado) return setErro(resultado.erro);
    setErro('');
    setSalvando(true);
    try {
      await api(`${base}/configuracao`, { method: 'PUT', body: JSON.stringify(resultado.dados) });
      setSalvo(true);
    } catch (err) {
      setErro((err as Error).message);
    } finally {
      setSalvando(false);
    }
  }

  const criterios = form?.criterios ?? [];
  const moverCriterio = (de: number, para: number) => {
    const lista = [...criterios];
    [lista[de], lista[para]] = [lista[para], lista[de]];
    mudar({ criterios: lista });
  };
  const tiposLivres = (Object.keys(TIPOS_CRITERIO) as TipoCriterio[]).filter(
    (t) => t === 'MAIOR_PONTUACAO_DESAFIO' || !criterios.some((c) => c.tipo === t),
  );

  return (
    <form onSubmit={salvar} className="config">
      <header className="hero">
        <div>
          <h1>Configuração do evento</h1>
          <p>{evento ? `${evento.nome} · ` : ''}Regras de pontuação usadas em toda a apuração.</p>
        </div>
        <div className="hero-acoes">
          <Link to="/evento" className="btn btn-escuro">
            ← Eventos
          </Link>
          <button className="btn btn-claro" disabled={!form || salvando}>
            {salvando ? 'Salvando...' : 'Salvar configurações'}
          </button>
        </div>
      </header>

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      {salvo && (
        <p className="sucesso" role="status">
          Configurações salvas.
        </p>
      )}
      {!form && !erro && <p className="cartao">Carregando...</p>}

      {form && (
        <div className="config-grade">
          <Bloco icone="1º" titulo="Conversão em ponto extra" dica="Ponto extra do aluno pela colocação final do grupo.">
            {form.conversao.length === 0 && <p className="dica">Cadastre os grupos para definir uma linha por colocação.</p>}
            {form.conversao.map((valor, i) => (
              <Linha key={i} rotulo={`${i + 1}º lugar`}>
                <input
                  inputMode="decimal"
                  value={valor}
                  onChange={(e) => mudar({ conversao: form.conversao.map((v, j) => (j === i ? e.target.value : v)) })}
                  aria-label={`Ponto extra do ${i + 1}º lugar`}
                />
              </Linha>
            ))}
          </Bloco>

          <Bloco icone="+" titulo="Bonificações extras" dica="Cada item aceita pontos até o seu teto.">
            {form.itens.map((item, i) => (
              <div key={item.id ?? `novo-${i}`} className="config-item">
                <input
                  value={item.nome}
                  onChange={(e) => mudar({ itens: form.itens.map((it, j) => (j === i ? { ...it, nome: e.target.value } : it)) })}
                  placeholder="Nome do item"
                  aria-label={`Nome do item ${i + 1}`}
                />
                <input
                  inputMode="numeric"
                  value={item.teto}
                  onChange={(e) => mudar({ itens: form.itens.map((it, j) => (j === i ? { ...it, teto: e.target.value } : it)) })}
                  aria-label={`Teto de ${item.nome || `item ${i + 1}`}`}
                />
                <button
                  type="button"
                  className="btn-icone"
                  onClick={() => mudar({ itens: form.itens.filter((_, j) => j !== i) })}
                  aria-label={`Remover ${item.nome || `item ${i + 1}`}`}
                >
                  ×
                </button>
              </div>
            ))}
            <button type="button" className="btn btn-contorno" onClick={() => mudar({ itens: [...form.itens, { nome: '', teto: '' }] })}>
              + Adicionar item
            </button>
          </Bloco>

          <Bloco icone="!" titulo="Limites de penalidade" dica="Faixa aceita em cada penalidade lançada.">
            <Linha rotulo="Mínimo por item">
              <input inputMode="numeric" value={form.penalidadeMin} onChange={(e) => mudar({ penalidadeMin: e.target.value })} aria-label="Penalidade mínima" />
            </Linha>
            <Linha rotulo="Máximo por item">
              <input inputMode="numeric" value={form.penalidadeMax} onChange={(e) => mudar({ penalidadeMax: e.target.value })} aria-label="Penalidade máxima" />
            </Linha>
          </Bloco>

          <Bloco icone="%" titulo="Fator de presença" dica="Multiplica o ponto extra conforme os dias presentes.">
            {form.fatores
              .map((valor, d) => ({ valor, d }))
              .reverse()
              .map(({ valor, d }) => {
                const total = form.fatores.length - 1;
                const rotulo = d === total ? `Presença total (${d} ${d === 1 ? 'dia' : 'dias'})` : d === 0 ? 'Ausência (0 dias)' : `Presença parcial (${d} ${d === 1 ? 'dia' : 'dias'})`;
                return (
                  <Linha key={d} rotulo={rotulo} sufixo="%">
                    <input
                      inputMode="decimal"
                      value={valor}
                      onChange={(e) => mudar({ fatores: form.fatores.map((v, j) => (j === d ? e.target.value : v)) })}
                      aria-label={`Fator para ${rotulo}, em porcentagem`}
                    />
                  </Linha>
                );
              })}
          </Bloco>

          <Bloco icone="⇅" titulo="Critérios de desempate" dica="Aplicados nesta ordem; se nenhum resolver, o empate vai para decisão manual." largo>
            {descartados > 0 && (
              <p className="erro">
                {descartados === 1 ? 'Um critério salvo usa' : `${descartados} critérios salvos usam`} &quot;Maior presença&quot;, que saiu do contrato. Ele foi
                retirado da lista e some ao salvar.
              </p>
            )}
            {criterios.length === 0 && <p className="dica">Nenhum critério: todo empate irá para decisão manual.</p>}
            <ol className="criterios">
              {criterios.map((c, i) => (
                <li key={i} className="criterio">
                  <span className="criterio-ordem">{i + 1}</span>
                  <select
                    value={c.tipo}
                    onChange={(e) =>
                      mudar({ criterios: criterios.map((x, j) => (j === i ? { tipo: e.target.value as TipoCriterio, desafioId: null } : x)) })
                    }
                    aria-label={`Tipo do ${i + 1}º critério`}
                  >
                    {(Object.keys(TIPOS_CRITERIO) as TipoCriterio[])
                      .filter((t) => t === c.tipo || tiposLivres.includes(t))
                      .map((t) => (
                        <option key={t} value={t}>
                          {TIPOS_CRITERIO[t]}
                        </option>
                      ))}
                  </select>
                  {c.tipo === 'MAIOR_PONTUACAO_DESAFIO' && (
                    <select
                      value={c.desafioId ?? ''}
                      onChange={(e) => mudar({ criterios: criterios.map((x, j) => (j === i ? { ...x, desafioId: Number(e.target.value) || null } : x)) })}
                      aria-label={`Desafio do ${i + 1}º critério`}
                    >
                      <option value="">Escolha o desafio</option>
                      {desafios.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.nome}
                        </option>
                      ))}
                    </select>
                  )}
                  <span className="criterio-acoes">
                    <button type="button" className="btn-icone" disabled={i === 0} onClick={() => moverCriterio(i, i - 1)} aria-label={`Subir ${i + 1}º critério`}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn-icone"
                      disabled={i === criterios.length - 1}
                      onClick={() => moverCriterio(i, i + 1)}
                      aria-label={`Descer ${i + 1}º critério`}
                    >
                      ↓
                    </button>
                    <button type="button" className="btn-icone" onClick={() => mudar({ criterios: criterios.filter((_, j) => j !== i) })} aria-label={`Remover ${i + 1}º critério`}>
                      ×
                    </button>
                  </span>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="btn btn-contorno"
              onClick={() => mudar({ criterios: [...criterios, { tipo: tiposLivres.find((t) => t !== 'MAIOR_PONTUACAO_DESAFIO') ?? 'MAIOR_PONTUACAO_DESAFIO', desafioId: null }] })}
            >
              + Adicionar critério
            </button>
          </Bloco>
        </div>
      )}
    </form>
  );
}

function Bloco({ icone, titulo, dica, largo, children }: { icone: string; titulo: string; dica: string; largo?: boolean; children: ReactNode }) {
  return (
    <section className={`cartao config-bloco${largo ? ' config-largo' : ''}`}>
      <h2>
        <span className="icone" aria-hidden="true">
          {icone}
        </span>
        {titulo}
      </h2>
      <p className="dica">{dica}</p>
      {children}
    </section>
  );
}

function Linha({ rotulo, sufixo, children }: { rotulo: string; sufixo?: string; children: ReactNode }) {
  return (
    <div className="config-linha">
      <span>{rotulo}</span>
      <span className="config-valor">
        {children}
        {sufixo && <span aria-hidden="true">{sufixo}</span>}
      </span>
    </div>
  );
}
