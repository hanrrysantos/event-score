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

export async function api<T>(caminho: string, init: RequestInit = {}): Promise<T> {
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
  const texto = await resposta.text();
  return (texto ? JSON.parse(texto) : undefined) as T;
}
