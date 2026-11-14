import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, ApiError, type Schemas } from '../../api/client';
import { useLayout } from '../../components/Layout';
import Paginacao from '../../components/Paginacao';
import { fatorParaPercentual } from '../../numero.ts';
import { iniciais } from '../../texto';

// Formato do contrato v0.3 (apuração individual); ainda fora do OpenAPI oficial.
type Linha = {
  participanteId: number;
  matricula: string;
  nome: string;
  turma: string;
  grupo: string;
  colocacaoGrupo: number | null;
  pontoExtraGrupo: number;
  diasPresentes: number;
  diasTotais: number;
  fator: number;
  pontoExtra: number;
};
type Apuracao = {
  dados: Linha[];
  paginacao: Schemas['PaginacaoMetaDto'];
  resumo: { totalParticipantes: number; assiduidade: number; aptos: number };
};

const TAMANHO = 20;
const decimal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

// Ponto extra = conversão da colocação final do grupo × fator de presença (RF16), calculado pela API na consulta.
// "Executar apuração final" do mock virou link para os relatórios: não há nada a gravar (contrato v0.3).
export default function Apuracao() {
  const { eventoAtivo } = useLayout();
  const eventoId = eventoAtivo?.id;
  const [grupos, setGrupos] = useState<Schemas['GrupoResumoDto'][]>([]);
  const [filtro, setFiltro] = useState({ busca: '', grupoId: '', pagina: 1 });
  const [texto, setTexto] = useState('');
  const [apuracao, setApuracao] = useState<Apuracao>();
  const [empate, setEmpate] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!eventoId) return;
    api<Schemas['GrupoResumoDto'][]>(`/eventos/${eventoId}/grupos`)
      .then(setGrupos)
      .catch(() => {});
  }, [eventoId]);

  useEffect(() => {
    if (!eventoId) return;
    const params = new URLSearchParams({ pagina: String(filtro.pagina), tamanho: String(TAMANHO) });
    if (filtro.grupoId) params.set('grupoId', filtro.grupoId);
    if (filtro.busca) params.set('busca', filtro.busca);
    api<Apuracao>(`/eventos/${eventoId}/apuracao?${params}`)
      .then((r) => {
        setApuracao(r);
        setEmpate('');
        setErro('');
      })
      .catch((e: Error) => {
        // 409: a classificação ainda tem empate que só a decisão manual resolve.
        setApuracao(undefined);
        if (e instanceof ApiError && e.status === 409) setEmpate(e.message);
        else setErro(e.message);
      });
  }, [eventoId, filtro]);

  if (eventoAtivo === undefined) return <p className="cartao">Carregando...</p>;
  if (eventoAtivo === null) {
    return (
      <p className="cartao">
        Nenhum evento ativo. Ative um evento na aba <Link to="/evento">Evento</Link> para ver a apuração.
      </p>
    );
  }

  function buscar(e: FormEvent) {
    e.preventDefault();
    setFiltro({ ...filtro, busca: texto.trim(), pagina: 1 });
  }

  const resumo = apuracao?.resumo;
  const pctAptos = resumo?.totalParticipantes ? (resumo.aptos / resumo.totalParticipantes) * 100 : 0;

  return (
    <>
      <header className="hero">
        <div>
          <h1>Apuração individual</h1>
          <p>Ponto extra = conversão da colocação do grupo × fator de presença.</p>
        </div>
        <Link to="/relatorios" className="btn btn-claro">
          Ir para os relatórios
        </Link>
      </header>

      {empate && (
        <div className="cartao pendentes" role="alert">
          <span>{empate}</span>
          <Link to="/lancamentos?aba=classificacao" className="btn">
            Resolver o desempate
          </Link>
        </div>
      )}
      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}

      {resumo && (
        <div className="contagem contagem-3">
          <div className="cartao">
            <small>Alunos</small>
            <strong>{resumo.totalParticipantes}</strong>
          </div>
          <div className="cartao">
            <small>Presença média</small>
            <strong>{fatorParaPercentual(resumo.assiduidade)}%</strong>
            <span className="barra">
              <span style={{ width: `${resumo.assiduidade * 100}%` }} />
            </span>
          </div>
          <div className="cartao">
            <small>Alunos com ponto extra</small>
            <strong>{resumo.aptos}</strong>
            <span className="barra">
              <span style={{ width: `${pctAptos}%` }} />
            </span>
          </div>
        </div>
      )}

      <section className="cartao tabela-cartao">
        <div className="tabela-topo">
          <h2 className="titulo-bloco">Cálculo por aluno{apuracao ? ` (${apuracao.paginacao.totalItens})` : ''}</h2>
          <form className="filtros" onSubmit={buscar} role="search">
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nome ou matrícula" aria-label="Buscar aluno" />
            <select value={filtro.grupoId} onChange={(e) => setFiltro({ ...filtro, grupoId: e.target.value, pagina: 1 })} aria-label="Filtrar por grupo">
              <option value="">Todos os grupos</option>
              {grupos.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nome}
                </option>
              ))}
            </select>
            <button className="btn btn-cinza">Buscar</button>
          </form>
        </div>

        {!apuracao && !empate && !erro && <p className="dica">Carregando...</p>}
        {apuracao?.dados.length === 0 && <p className="dica">Nenhum aluno encontrado.</p>}
        {!!apuracao?.dados.length && (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Aluno</th>
                  <th>Turma</th>
                  <th>Grupo</th>
                  <th>Ponto extra do grupo</th>
                  <th>Presença</th>
                  <th>Ponto extra</th>
                </tr>
              </thead>
              <tbody>
                {apuracao.dados.map((l) => (
                  <tr key={l.participanteId}>
                    <td>
                      <span className="pessoa">
                        <span className="avatar" aria-hidden="true">
                          {iniciais(l.nome)}
                        </span>
                        <span>
                          {l.nome}
                          <small className="sub">{l.matricula}</small>
                        </span>
                      </span>
                    </td>
                    <td>{l.turma}</td>
                    <td>
                      {l.grupo}
                      {l.colocacaoGrupo !== null && <small className="sub">{l.colocacaoGrupo}º lugar</small>}
                    </td>
                    <td>{decimal(l.pontoExtraGrupo)}</td>
                    <td>
                      {fatorParaPercentual(l.fator)}%
                      <small className="sub">
                        {l.diasPresentes} de {l.diasTotais} {l.diasTotais === 1 ? 'dia' : 'dias'}
                      </small>
                    </td>
                    <td>
                      <strong>{decimal(l.pontoExtra)}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Paginacao meta={apuracao?.paginacao} irPara={(p) => setFiltro({ ...filtro, pagina: p })} />
      </section>
    </>
  );
}
