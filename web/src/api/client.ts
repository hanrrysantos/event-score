import type { components } from './schema';

export type Schemas = components['schemas'];

const BASE = '/api/v1';
const CHAVE_TOKEN = 'eventscore.token';

// "Manter conectado" decide onde o token fica: localStorage sobrevive ao fechar o navegador.
export const token = {
  ler: () => localStorage.getItem(CHAVE_TOKEN) ?? sessionStorage.getItem(CHAVE_TOKEN),
  salvar(valor: string, manter: boolean) {
    (manter ? localStorage : sessionStorage).setItem(CHAVE_TOKEN, valor);
  },
  limpar() {
    localStorage.removeItem(CHAVE_TOKEN);
    sessionStorage.removeItem(CHAVE_TOKEN);
  },
};

export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Erro no formato do NestJS: message é texto ou lista (ValidationPipe).
export function mensagemDeErro(status: number, corpo: unknown): string {
  const message = (corpo as { message?: unknown } | null)?.message;
  if (Array.isArray(message)) return message.join('\n');
  if (typeof message === 'string' && message) return message;
  return `Erro ${status} ao falar com o servidor.`;
}

/** Lê o nome do arquivo do Content-Disposition (filename*=UTF-8''... ou filename="..."). */
export function nomeDoArquivo(disposicao: string | null, padrao: string): string {
  const utf8 = disposicao?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (utf8) return decodeURIComponent(utf8.trim());
  return disposicao?.match(/filename="?([^";]+)"?/i)?.[1]?.trim() || padrao;
}

/**
 * Baixa um arquivo da API com o token no cabeçalho, nunca por link aberto: o relatório final tem nome e
 * matrícula de aluno (RNF03). O nome vem do Content-Disposition, que a API expõe no CORS.
 */
export async function baixar(caminho: string, nomePadrao: string): Promise<void> {
  const resposta = await requisitar(caminho, {});
  const url = URL.createObjectURL(await resposta.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeDoArquivo(resposta.headers.get('Content-Disposition'), nomePadrao);
  link.click();
  URL.revokeObjectURL(url);
}

export async function api<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const texto = await (await requisitar(caminho, init)).text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}

async function requisitar(caminho: string, init: RequestInit): Promise<Response> {
  const headers = new Headers(init.headers);
  const atual = token.ler();
  if (atual) headers.set('Authorization', `Bearer ${atual}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  let resposta: Response;
  try {
    resposta = await fetch(BASE + caminho, { ...init, headers });
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Tente de novo.');
  }

  if (resposta.status === 401 && caminho !== '/auth/login') {
    token.limpar();
    window.location.assign('/login');
  }
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new ApiError(resposta.status, mensagemDeErro(resposta.status, corpo));
  }
  return resposta;
}
