// Formatos do contrato v0.3 (importação de participantes); ainda fora do OpenAPI oficial.
export type LinhaPrevia = {
  linha: number;
  nome: string | null;
  matricula: string | null;
  turma: string | null;
  grupo: string | null;
  status: 'VALIDO' | 'ERRO';
  motivoErro: string | null;
};

export type Previa = { totalLinhas: number; linhasValidas: number; linhasComErro: number; linhas: LinhaPrevia[] };

export const EXTENSOES = ['.csv', '.xlsx'];
export const TAMANHO_MAXIMO = 5 * 1024 * 1024;

/** Recusa no próprio navegador o arquivo que a API recusaria, para não gastar o envio. */
export function problemaDoArquivo(arquivo: { name: string; size: number }): string | null {
  const nome = arquivo.name.toLowerCase();
  if (!EXTENSOES.some((ext) => nome.endsWith(ext))) return 'Envie a planilha em .csv ou .xlsx.';
  if (arquivo.size > TAMANHO_MAXIMO) return 'A planilha passa de 5 MB.';
  if (arquivo.size === 0) return 'A planilha está vazia.';
  return null;
}

/** Texto do relatório de inconsistências (.txt), gerado pelo front a partir da prévia. */
export function relatorioInconsistencias(previa: Previa, arquivo: string): string {
  const erros = previa.linhas.filter((l) => l.status === 'ERRO');
  return [
    `Relatório de inconsistências - ${arquivo}`,
    `Linhas: ${previa.totalLinhas} | válidas: ${previa.linhasValidas} | com erro: ${previa.linhasComErro}`,
    '',
    ...erros.map((l) => `Linha ${l.linha}: ${l.nome || '(sem nome)'} (${l.matricula || 'sem matrícula'}) - ${l.motivoErro ?? 'erro'}`),
    '',
  ].join('\r\n');
}
