// A tela mostra números no padrão brasileiro ("0,8"); a API usa número JSON (0.8).

/** "0,8" ou "0.8" -> 0.8; texto vazio ou inválido -> NaN. */
export function lerNumero(texto: string): number {
  const limpo = texto.trim().replace(',', '.');
  return limpo === '' || !/^-?\d*\.?\d+$/.test(limpo) ? NaN : Number(limpo);
}

/** 0.8 -> "0,8" */
export const mostrarNumero = (valor: number) => String(valor).replace('.', ',');

/** Fator 0.5 da API <-> "50" na tela (em %). */
export const fatorParaPercentual = (fator: number) => mostrarNumero(Math.round(fator * 10000) / 100);
export const percentualParaFator = (texto: string) => Math.round(lerNumero(texto) * 100) / 10000;
