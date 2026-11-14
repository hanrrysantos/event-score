import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { api, baixar } from '../../api/client';
import { useLayout } from '../../components/Layout';
import './Relatorios.css';

// Formato do contrato v0.3 (prévia do relatório final); ainda fora do OpenAPI oficial.
type Turma = {
  turma: string;
  totalParticipantes: number;
  participantes: { matricula: string; nome: string; grupo: string; presencas: { numeroDia: number; presente: boolean }[]; pontoExtra: number }[];
};

const RELATORIOS = {
  parcial: ['Relatório parcial por grupo', 'Classificação das equipes só com os desafios já lançados, para divulgar durante o evento (RF15).'],
  final: ['Relatório final por participante', 'Lista importada, agrupada por turma, com presença por dia e ponto extra (RF17).'],
} as const;
type Tipo = keyof typeof RELATORIOS;
type Formato = 'PDF' | 'XLSX';

const decimal = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
const slug = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

// O histórico de exportações e a ata assinada do mock saíram: não estão nos requisitos nem no DER (contrato v0.3).
export default function Relatorios() {
  const { eventoAtivo } = useLayout();
  const eventoId = eventoAtivo?.id;
  const [baixando, setBaixando] = useState<string>();
  const [aviso, setAviso] = useState<{ tipo: 'erro' | 'sucesso'; texto: string }>();
  const [turmas, setTurmas] = useState<Turma[]>();
  const [busca, setBusca] = useState('');
  const [texto, setTexto] = useState('');
  const [erroPrevia, setErroPrevia] = useState('');

  useEffect(() => {
    if (!eventoId) return;
    const params = busca ? `?${new URLSearchParams({ busca })}` : '';
    api<Turma[]>(`/eventos/${eventoId}/relatorios/final/previa${params}`)
      .then((t) => {
        setTurmas(t);
        setErroPrevia('');
      })
      .catch((e: Error) => {
        setTurmas(undefined);
        setErroPrevia(e.message);
      });
  }, [eventoId, busca]);

  if (eventoAtivo === undefined) return <p className="cartao">Carregando...</p>;
  if (eventoAtivo === null) {
    return (
      <p className="cartao">
        Nenhum evento ativo. Ative um evento na aba <Link to="/evento">Evento</Link> para gerar os relatórios.
      </p>
    );
  }

  async function gerar(tipo: Tipo, formato: Formato) {
    const chave = `${tipo}-${formato}`;
    setBaixando(chave);
    setAviso(undefined);
    try {
      const padrao = `relatorio-${tipo}-${slug(eventoAtivo!.nome)}.${formato.toLowerCase()}`;
      await baixar(`/eventos/${eventoAtivo!.id}/relatorios/${tipo}?formato=${formato}`, padrao);
      setAviso({ tipo: 'sucesso', texto: `${RELATORIOS[tipo][0]} (${formato}) baixado.` });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: (e as Error).message });
    } finally {
      setBaixando(undefined);
    }
  }

  function buscar(e: FormEvent) {
    e.preventDefault();
    setBusca(texto.trim());
  }

  const dias = [...new Set(turmas?.flatMap((t) => t.participantes.flatMap((p) => p.presencas.map((d) => d.numeroDia))))].sort((a, b) => a - b);

  return (
    <>
      <header className="hero">
        <div>
          <h1>Relatórios</h1>
          <p>Exporte os resultados do evento. Os arquivos têm dados pessoais: não publique em mural ou grupo (RNF03).</p>
        </div>
      </header>

      {aviso && (
        <p className={aviso.tipo} role={aviso.tipo === 'erro' ? 'alert' : 'status'}>
          {aviso.texto}
        </p>
      )}

      <div className="relatorios">
        {(Object.keys(RELATORIOS) as Tipo[]).map((tipo) => (
          <section key={tipo} className="cartao relatorio">
            <h2 className="titulo-bloco">
              <span className="icone" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={tipo === 'parcial' ? 'M4 20h16M7 16v-5M12 16V6M17 16v-8' : 'M6 3h9l3 3v15H6zM9 11h6M9 15h6'} />
                </svg>
              </span>
              {RELATORIOS[tipo][0]}
            </h2>
            <p className="dica">{RELATORIOS[tipo][1]}</p>
            <div className="relatorio-acoes">
              {(['PDF', 'XLSX'] as Formato[]).map((formato) => (
                <button key={formato} className="btn" onClick={() => gerar(tipo, formato)} disabled={baixando !== undefined}>
                  {baixando === `${tipo}-${formato}` ? 'Gerando...' : `Gerar ${formato}`}
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="cartao tabela-cartao">
        <div className="tabela-topo">
          <h2 className="titulo-bloco">Prévia do relatório final</h2>
          <form className="filtros" onSubmit={buscar} role="search">
            <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Buscar por nome, matrícula ou turma" aria-label="Buscar na prévia" />
            <button className="btn btn-cinza">Buscar</button>
          </form>
        </div>

        {erroPrevia && (
          <p className="erro" role="alert">
            {erroPrevia}
          </p>
        )}
        {!turmas && !erroPrevia && <p className="dica">Carregando...</p>}
        {turmas?.length === 0 && <p className="dica">Nenhum participante encontrado.</p>}

        {turmas?.map((t) => (
          <div key={t.turma} className="turma">
            <h3>
              {t.turma} <small className="dica">· {t.totalParticipantes} participantes</small>
            </h3>
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Matrícula</th>
                    <th>Nome</th>
                    <th>Grupo</th>
                    {dias.map((d) => (
                      <th key={d}>Dia {d}</th>
                    ))}
                    <th>Ponto extra</th>
                  </tr>
                </thead>
                <tbody>
                  {t.participantes.map((p) => (
                    <tr key={p.matricula}>
                      <td>{p.matricula}</td>
                      <td>{p.nome}</td>
                      <td>{p.grupo}</td>
                      {dias.map((d) => {
                        const presente = p.presencas.find((x) => x.numeroDia === d)?.presente;
                        return (
                          <td key={d} className={presente ? 'presente' : 'ausente-texto'}>
                            {presente ? 'Presente' : 'Ausente'}
                          </td>
                        );
                      })}
                      <td>
                        <strong>{decimal(p.pontoExtra)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
