import { lerNumero } from '../../numero.ts';

// Formato do contrato v0.3 (desafios); ainda fora do OpenAPI oficial.
export type Pontos = { colocacao: number; pontos: number };
export type Desafio = { id: number; nome: string; descricao: string; diaId: number; pontosColocacao: Pontos[] };
export type FormDesafio = { nome: string; descricao: string; diaId: string; pontos: string[] };

/** Uma linha por grupo (RF06), preenchida com os pontos já cadastrados. */
export function paraFormulario(desafio: Desafio | undefined, grupos: number): FormDesafio {
  const ponto = (c: number) => desafio?.pontosColocacao.find((p) => p.colocacao === c)?.pontos;
  return {
    nome: desafio?.nome ?? '',
    descricao: desafio?.descricao ?? '',
    diaId: desafio ? String(desafio.diaId) : '',
    pontos: Array.from({ length: grupos }, (_, i) => String(ponto(i + 1) ?? '')),
  };
}

export function montarDesafio(f: FormDesafio, grupos: number): { dados: Omit<Desafio, 'id'> } | { erro: string } {
  if (!f.nome.trim()) return { erro: 'Informe o nome do desafio.' };
  if (!f.diaId) return { erro: 'Escolha o dia do desafio.' };
  if (grupos === 0) return { erro: 'Cadastre os grupos antes: a tabela de pontos tem uma linha por grupo.' };
  if (f.pontos.length !== grupos) return { erro: `A tabela de pontos precisa ter uma linha por grupo (${grupos}).` };
  const pontosColocacao = f.pontos.map((t, i) => ({ colocacao: i + 1, pontos: lerNumero(t) }));
  const ruim = pontosColocacao.find((p) => !(Number.isInteger(p.pontos) && p.pontos >= 0));
  if (ruim) return { erro: `Informe os pontos do ${ruim.colocacao}º lugar (número inteiro).` };
  return { dados: { nome: f.nome.trim(), descricao: f.descricao.trim(), diaId: Number(f.diaId), pontosColocacao } };
}
