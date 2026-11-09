# ADR 0002: Bloqueio de grupos após resultado lançado (RF03)

- **Status:** Aceito.
- **Data:** 2026-11-09
- **Tarefa:** US05 / T22

## Contexto

O RF03 determina que grupos só podem ser criados, editados ou excluídos enquanto
não houver resultado lançado no evento. A equipe de banco já implementou essa
regra no banco, no trigger `trg_grupo_bloqueia_apos_resultado` (migração V6), que
impede INSERT, UPDATE e DELETE em `grupo` quando o evento já tem `resultado_desafio`.

Ficaram em aberto duas decisões de backend:

1. Como expor o bloqueio para o cliente da API (que espera `409` conforme o contrato T06).
2. O que fazer ao excluir um grupo que já possui participantes vinculados (a FK
   `participante → grupo` não tem `ON DELETE`, então o banco também recusa).

## Decisão

1. **O banco é a fonte de verdade.** O backend não replica a verificação manual do
   bloqueio; ele mapeia o erro do Postgres para a resposta HTTP.
2. **Mapeamento do bloqueio.** O trigger usa `restrict_violation` (SQLSTATE `23001`),
   que o Prisma devolve como `P2003` (mesmo código de FK inexistente). O
   `GruposService` converte `P2003` em `ConflictException` (409) com a mensagem
   prevista no contrato.
3. **Exclusão de grupo com participantes.** Recusar com `409`, sem `CASCADE`,
   conforme o contrato e o ponto #3 da seção 6 do plano de entregas. O banco já
   recusa pela FK; o serviço faz um `count` prévio em `participante` para devolver
   uma mensagem clara antes de tentar o `DELETE`.
4. **Duplicidade de nome ou cor.** A violação dos índices `ux_grupo_nome` e
   `ux_grupo_cor` chega como `P2002` e vira `409` (conflito de cadastro).
5. **Formato da cor.** A validação `#RRGGBB` fica no DTO (`class-validator`), sem
   criar `CHECK` novo no banco (ponto #7 da seção 6 do plano).

## Consequências

- O endpoint `401` continua pendente até o guard de autenticação da US03 (T14);
  os DTOs e o controller já declaram `@ApiBearerAuth()`.
- O mapeamento `P2003`/`P2002` fica local no serviço até a T09 (tratamento de
  erros) poder evoluí-lo para um filtro global de exceções.
- Nenhuma migração nova é necessária para a regra: o trigger da V6 permanece
  inalterado.
