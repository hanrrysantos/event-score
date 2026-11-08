# US6: persistência sobre o banco oficial

A US6 usa o `PrismaService` e o client gerado para acessar `evento` e
`dia_evento`. O schema Prisma da aplicação é o mapeamento das tabelas oficiais;
as migrations SQL V1–V11 continuam sendo a fonte de verdade, incluindo CHECKs,
triggers, funções, views e índices que não são expressos pelo Prisma.

## Fluxo de banco

Instalação e evolução do banco devem usar as migrations oficiais, em ordem:

```bash
DATABASE_URL='postgresql://.../eventscore_test' npm run db:deploy
DATABASE_URL='postgresql://.../eventscore_test' npm run db:generate
```

Não há uma migration Prisma paralela da US6 neste branch. A migration mínima
que existia na implementação inicial não foi aplicada nem incorporada à base
oficial; ela foi removida do diff para evitar dois fluxos de criação do schema.

O runtime usa apenas o client Prisma parcial necessário ao módulo de dias, mas
ele opera sobre a base completa criada por V1–V11. Não executar `prisma db push`,
`prisma migrate reset`, `prisma migrate dev` ou SQL destrutivo de
`prisma migrate diff` contra uma base oficial ou compartilhada.

## Reprodução do e2e

O teste exige explicitamente o cenário oficial e falha se essa variável não for
informada ou se as tabelas esperadas não existirem:

```bash
US6_E2E_SCHEMA=official \
DATABASE_URL='postgresql://.../eventscore_test' \
npm run test:e2e -- test/dias-evento.e2e-spec.ts
```

Use um PostgreSQL descartável criado exclusivamente com V1–V11. Credenciais e
URLs devem permanecer no ambiente local ou no gerenciador de segredos; não são
versionadas.

## Exclusão segura

O DELETE verifica `presenca` e `desafio` antes de excluir. Retorna `409` quando
há dependência e `503` somente quando as estruturas oficiais necessárias para a
verificação não estão disponíveis. Outros erros de banco não são convertidos
em `503` e não têm seus detalhes expostos na resposta HTTP.

## Limitações e dependências

As rotas ainda dependem da integração do guard JWT da US03/T09 para serem
consideradas privadas. `@ApiBearerAuth()` documenta o contrato Swagger, mas não
substitui um guard. Essa integração não faz parte da US6.
