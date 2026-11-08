import { useRef, useState, type DragEvent } from 'react';
import { Link } from 'react-router';
import { api } from '../../api/client';
import { useLayout } from '../../components/Layout';
import { iniciais } from '../../texto';
import { EXTENSOES, problemaDoArquivo, relatorioInconsistencias, type Previa } from './importacao.ts';
import ListaParticipantes from './ListaParticipantes';
import './Participantes.css';

// A prévia valida sem gravar; a confirmação reenvia o mesmo arquivo e só grava se não houver erro (contrato v0.3).
export default function Participantes() {
  const { eventoAtivo } = useLayout();
  const entrada = useRef<HTMLInputElement>(null);
  const [arquivo, setArquivo] = useState<File>();
  const [previa, setPrevia] = useState<Previa>();
  const [soErros, setSoErros] = useState(false);
  const [arrastando, setArrastando] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const [versaoLista, setVersaoLista] = useState(0);

  if (eventoAtivo === undefined) return <p className="cartao">Carregando...</p>;
  if (eventoAtivo === null) {
    return (
      <p className="cartao">
        Nenhum evento ativo. Ative um evento na aba <Link to="/evento">Evento</Link> para importar os participantes.
      </p>
    );
  }
  const base = `/eventos/${eventoAtivo.id}/participantes`;

  const enviar = (caminho: string, arq: File) => {
    const corpo = new FormData();
    corpo.append('arquivo', arq);
    return api<Previa>(caminho, { method: 'POST', body: corpo });
  };

  async function escolher(arq: File | undefined) {
    if (!arq) return;
    setErro('');
    setSucesso('');
    setPrevia(undefined);
    const problema = problemaDoArquivo(arq);
    if (problema) return setErro(problema);
    setArquivo(arq);
    setOcupado(true);
    try {
      const resultado = await enviar(`${base}/importacao/previa`, arq);
      setPrevia(resultado);
      setSoErros(resultado.linhasComErro > 0);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
      if (entrada.current) entrada.current.value = '';
    }
  }

  async function confirmar() {
    if (!arquivo || !previa) return;
    setErro('');
    setOcupado(true);
    try {
      await enviar(`${base}/importacao`, arquivo);
      setSucesso(`${previa.linhasValidas} participantes importados de ${arquivo.name}.`);
      setPrevia(undefined);
      setArquivo(undefined);
      setVersaoLista((v) => v + 1);
    } catch (e) {
      setErro((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  function baixarRelatorio() {
    if (!previa || !arquivo) return;
    const url = URL.createObjectURL(new Blob([relatorioInconsistencias(previa, arquivo.name)], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `inconsistencias-${arquivo.name.replace(/\.[^.]+$/, '')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastando(false);
    escolher(e.dataTransfer.files[0]);
  }

  const linhas = previa?.linhas.filter((l) => !soErros || l.status === 'ERRO') ?? [];
  const pct = (n: number) => (previa?.totalLinhas ? `${(n / previa.totalLinhas) * 100}%` : '0%');

  return (
    <>
      <header className="hero">
        <div>
          <h1>Importação de participantes</h1>
          <p>Envie a planilha oficial. Só é possível confirmar sem erros.</p>
        </div>
        {arquivo && <small className="hero-arquivo">Arquivo: {arquivo.name}</small>}
      </header>

      <section
        className={`cartao soltar${arrastando ? ' soltar-ativo' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        aria-busy={ocupado}
      >
        <span className="soltar-icone" aria-hidden="true">
          ↑
        </span>
        <strong>{ocupado ? 'Validando a planilha...' : 'Arraste a planilha aqui'}</strong>
        <small>Formatos aceitos: CSV (UTF-8) ou XLSX, até 5 MB. Colunas: nome, matricula, turma, grupo.</small>
        <button type="button" className="btn btn-cinza" onClick={() => entrada.current?.click()} disabled={ocupado}>
          Selecionar arquivo
        </button>
        <input ref={entrada} type="file" accept={EXTENSOES.join(',')} hidden onChange={(e) => escolher(e.target.files?.[0])} />
      </section>

      {erro && (
        <p className="erro" role="alert">
          {erro}
        </p>
      )}
      {sucesso && (
        <p className="sucesso" role="status">
          {sucesso}
        </p>
      )}

      {previa && (
        <>
          <div className="contagem">
            <div className="cartao">
              <small>Linhas válidas</small>
              <strong className="contagem-ok">{String(previa.linhasValidas).padStart(2, '0')}</strong>
              <span className="barra">
                <span style={{ width: pct(previa.linhasValidas) }} />
              </span>
            </div>
            <div className="cartao">
              <small>Linhas com erro</small>
              <strong className="contagem-erro">{String(previa.linhasComErro).padStart(2, '0')}</strong>
              <span className="barra barra-erro">
                <span style={{ width: pct(previa.linhasComErro) }} />
              </span>
            </div>
          </div>

          <section className="cartao tabela-cartao">
            <div className="tabela-topo">
              <label className="interruptor-texto">
                <input type="checkbox" checked={soErros} onChange={(e) => setSoErros(e.target.checked)} /> Mostrar só linhas com erro
              </label>
              {previa.linhasComErro > 0 && (
                <button type="button" className="btn btn-contorno" onClick={baixarRelatorio}>
                  Baixar relatório de inconsistências (.txt)
                </button>
              )}
            </div>
            <div className="tabela-rolagem">
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Nome</th>
                    <th>Matrícula</th>
                    <th>Turma</th>
                    <th>Grupo</th>
                    <th>Status</th>
                    <th>Detalhe</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((l) => (
                    <tr key={l.linha}>
                      <td>{String(l.linha).padStart(2, '0')}</td>
                      <td>
                        <span className="pessoa">
                          <span className="avatar" aria-hidden="true">
                            {iniciais(l.nome ?? '')}
                          </span>
                          {l.nome || '—'}
                        </span>
                      </td>
                      <td>{l.matricula || '—'}</td>
                      <td>{l.turma || '—'}</td>
                      <td>{l.grupo || '—'}</td>
                      <td>
                        <span className={`selo ${l.status === 'VALIDO' ? 'selo-ok' : 'selo-erro'}`}>{l.status === 'VALIDO' ? 'Válida' : 'Erro'}</span>
                      </td>
                      <td>{l.motivoErro || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <footer className="rodape-acao">
            <small>
              {previa.linhasComErro > 0
                ? 'Corrija as linhas com erro e envie a planilha novamente.'
                : `${previa.linhasValidas} participantes prontos para importar.`}
            </small>
            <button className="btn" onClick={confirmar} disabled={ocupado || previa.linhasComErro > 0 || previa.linhasValidas === 0}>
              {ocupado ? 'Importando...' : 'Confirmar importação'}
            </button>
          </footer>
        </>
      )}

      <ListaParticipantes eventoId={eventoAtivo.id} versao={versaoLista} />
    </>
  );
}
