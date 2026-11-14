# Taiga #245 — Proposta de contrato de desafios

Status: proposta local para revisão. Não aprovada; módulo, DTOs TypeScript,
service e endpoints ainda não implementados nesta task.

O recorte [desafios-t245.yaml](./desafios-t245.yaml) reúne as cinco operações
de RF05/RF06 e os schemas necessários ao frontend. A proposta permite revisar
esse módulo antes de terminar o contrato dos demais módulos da Sprint 02.
Não altera o OpenAPI v0.1 nem publica uma versão oficial v0.2.

## Fontes e limite da proposta

- [PR #30 do frontend](https://github.com/hanrrysantos/event-score/pull/30),
  SHA `15f74ba7aa57a54039c021d739eebb415632707e`:
  `web/mock/openapi-mock.yaml`, `web/src/pages/desafios/regras.ts` e
  `web/src/pages/desafios/Desafios.tsx`.
- `prisma/schema.prisma` e migração V4: nomes e limites das colunas,
  vínculo composto entre desafio/dia/evento e unicidade por dia e evento.
- [ADR 0003](../../adr/0003-divergencias-banco-contrato.md): bloquear com 409
  a exclusão de desafio usado em critério de desempate.
- [Governança de contrato](../README.md): aprovação explícita do frontend
  e revisão do backend antes de implementar o novo contrato.

O mock do frontend é referência de compatibilidade, não comprovação de
aprovação do OpenAPI oficial. Os pontos abaixo ainda precisam de aceite.
Ikki deve alinhar a incorporação e o versionamento desse recorte. Luiz Meneses
deve confirmar o payload e as escolhas de comportamento antes dos DTOs.

## Interface proposta

| Operação | Resposta | Formato |
| --- | --- | --- |
| GET `/eventos/{eventoId}/desafios` | 200 | Array de desafios; `[]` em evento existente sem desafios. |
| POST `/eventos/{eventoId}/desafios` | 201 | Desafio criado com tabela de pontos. |
| GET `/eventos/{eventoId}/desafios/{desafioId}` | 200 | Desafio e sua tabela de pontos. |
| PATCH `/eventos/{eventoId}/desafios/{desafioId}` | 200 | Desafio atualizado parcialmente. |
| DELETE `/eventos/{eventoId}/desafios/{desafioId}` | 204 | Sem corpo. |

Prefixo `/api/v1`, Bearer JWT do administrador e envelope de erro seguem
o contrato já aprovado. Evento, dia ou desafio fora do contexto retornam 404;
não revelar um recurso de outro evento. Não expor tipos Prisma nos DTOs.

O corpo de criação continua com os campos enviados pela tela:

```json
{
  "nome": "Hackathon",
  "descricao": "Desenvolvimento em equipe",
  "diaId": 2,
  "pontosColocacao": [
    { "colocacao": 1, "pontos": 100 },
    { "colocacao": 2, "pontos": 80 }
  ]
}
```

Os exemplos com duas colocações pressupõem dois grupos no evento. Nome,
dia e tabela são obrigatórios na criação. Descrição é opcional, com retorno
padronizado como string vazia quando o banco guarda null. O dia da URL de
eventos e `diaId` precisam pertencer ao mesmo evento.

No banco, nome tem no máximo 100 caracteres e descrição 255. A proposta
normaliza espaços externos, recusa nome em branco, números fracionários,
campos desconhecidos e null. Pontos são inteiros não negativos; não há
peso nem critério de avaliação no payload.

## Decisões para aprovação

1. **PATCH parcial.** A tela envia o formulário completo, mas o mock reutiliza
   um schema sem obrigatoriedade explícita. A proposta separa criação e PATCH:
   campo ausente preserva valor, descrição vazia limpa o texto e null é recusado.
   Ao informar a tabela, ela é substituída inteira em uma transação.
2. **Tabela de pontos.** Exigir um grupo ou mais e uma linha por grupo,
   colocações únicas e contíguas de 1 a N, sem impor ordem aos valores dos
   pontos. Array vazio e tipos inválidos dão 400; quantidade incompatível com
   grupos e colocações repetidas/com lacunas dão 422. Se o total de grupos
   mudar antes dos lançamentos, a próxima edição revalida a tabela resultante.
3. **Alteração após resultados.** Proposta conservadora: recusar mudança de
   dia ou de tabela com 409 quando já houver resultado; permitir nome e
   descrição. Se for necessário alterar pontuação depois de lançar resultados,
   precisamos definir o histórico e o recálculo com a auditoria compartilhada.
   Essa escolha ainda não consta do contrato oficial e não foi implementada.
4. **Exclusão com vínculos.** Critério de desempate já exige 409 pelo ADR.
   A proposta também recusa exclusão com resultado, preservando o histórico.
   Desafio sem vínculos impeditivos remove apenas seus pontos e o próprio
   cadastro, na mesma transação. Não apagar resultado em cascata.
5. **Normalização e ordenação.** Confirmar descrição sempre textual, limites
   reais do banco, ordenação dos desafios por número do dia/ID e dos pontos
   por colocação. Nome repetido no mesmo dia/evento retorna 409 conforme V4.

## O que cada task entrega

| Task | Próxima implementação após o aceite | Dependências |
| --- | --- | --- |
| #245 | Módulo exportável e DTOs alinhados ao contrato aprovado; testes de validação e Swagger. | Este recorte aprovado e incorporado ao contrato oficial. |
| #246 | Regras e persistência transacional; isolamento por evento; dependências de exclusão. | #245 mesclada e decisões acima aprovadas. |
| #247 | Endpoints protegidos pelo guard global existente. | #246 mesclada, autenticação e contrato aprovado. |
| #248 | HTTP, PostgreSQL, autenticação, tabelas e vínculos reais. | #247 mesclada e banco exclusivo de testes. |

Resultados de desafios e auditoria de lançamentos pertencem à #223, não
ao cadastro desta proposta. Não há mudança de schema ou migração prevista.

## Critério de liberação da tela

A tela de desafios do PR #30 carrega desafios, dias e grupos em conjunto
(`Promise.all`). Sua integração real depende também das rotas de dias e
grupos, hoje em PRs #13 e #29. A implementação das regras de desafios pode
usar os dados oficiais já persistidos e fixtures de teste sem esperar o
merge desses controllers; a tela completa precisa das três APIs.

## Taiga e revisão

- US #202: em andamento pela definição do contrato.
- #245: em andamento, aguardando revisão do contrato; não concluída.
- #246 a #248: novas, aguardando suas dependências.
- #223: ainda depende de desafios, grupos, configuração e auditoria.

Aprovações esperadas: frontend explícito (Luiz Meneses), backend conforme o
fluxo da equipe (revisor de Gustavo: Saylon) e alinhamento com Ikki para
publicação. O merge segue CI verde, uma aprovação válida e merge commit;
o aceite do frontend sobre o contrato também precisa ficar registrado.
