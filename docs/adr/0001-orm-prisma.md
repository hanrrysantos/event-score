# ADR 0001: Prisma como ORM e estratégia de migrações

- **Status:** Aceito. Estratégia de migrações validada com a equipe de banco (DEP01).
- **Data:** 2026-10-25 (atualizado em 2026-11-05 com a primeira migração)
- **Tarefa:** US01 / T03

## Contexto

O backend precisa de uma camada de acesso ao PostgreSQL e de uma forma versionada de evoluir o esquema. O Sprint 01 deixou a escolha entre Prisma e TypeORM em aberto.

Pontos que pesam na decisão:

- A equipe de banco é dona do modelo de dados (DER) e precisa conseguir ler e revisar o esquema e o SQL das migrações sem conhecer TypeScript a fundo.
- O RNF06 exige que regras de pontuação sejam dados, não código, o que torna o esquema relativamente grande (cerca de 17 tabelas).
- O prazo é curto (homologação em 16/11/2026), e seis pessoas vão consumir a camada de dados em paralelo.

## Opções consideradas

| Critério | Prisma 7 | TypeORM |
|---|---|---|
| Definição do esquema | Arquivo declarativo único (`schema.prisma`), legível sem conhecer TypeScript | Classes TypeScript com decorators espalhadas pelos módulos |
| Tipagem das consultas | Gerada a partir do esquema, inclusive para `select` e `include` | Parcial; consultas com relações e QueryBuilder perdem tipagem |
| Migrações | SQL puro gerado (`migration.sql`), fácil de revisar | Arquivos TypeScript com SQL embutido |
| Detecção de divergência entre esquema e banco | Nativa (`migrate dev`, `migrate diff`) | Limitada |
| Integração com NestJS | Serviço próprio estendendo `PrismaClient` | Módulo oficial `@nestjs/typeorm` |

## Decisão

Usar **Prisma 7** (`prisma` e `@prisma/client` `^7.10.1`) com o driver adapter `@prisma/adapter-pg`.

- `prisma/schema.prisma` é a fonte de verdade do esquema.
- O Prisma Client é gerado em `src/generated/prisma` (ignorado pelo git) via `prisma generate`, executado no `postinstall` e no `start:dev`.
- O acesso ao banco nos módulos é feito injetando `PrismaService` (módulo global em `src/prisma`).
- Não usar versões pré-lançamento (a tag `latest` do npm apontava para `8.0.0-rc` na data desta decisão).

### Estratégia de migrações (proposta para a DEP01)

1. A equipe de banco modela no DER; o backend transcreve o modelo aprovado para o `schema.prisma`.
2. O backend gera as migrações com `npm run db:migrate` (`prisma migrate dev`).
3. Todo PR que adiciona migração tem o `migration.sql` revisado pela equipe de banco.
4. Restrições que o Prisma não expressa (por exemplo, `CHECK` da faixa de penalidade) são adicionadas à mão: `prisma migrate dev --create-only` e edição do SQL antes de aplicar.
5. A massa de teste da equipe de banco vira o seed do Prisma.
6. Nenhum script SQL é aplicado ao banco fora das migrações, para evitar divergência entre esquema e código.
7. Migrações já aplicadas nunca são editadas; correções viram uma nova migração.

### Aplicação das migrações

- **Desenvolvimento:** `npm run start:dev` executa `prisma migrate deploy` e `prisma generate` antes de iniciar, então migrações recebidas via `git pull` são aplicadas automaticamente.
- **Produção:** migrações são um passo explícito do deploy (`npm run db:deploy`), nunca executadas pela aplicação ao iniciar.

## Consequências

- Cada desenvolvedor precisa do PostgreSQL rodando (`docker compose up -d`) para executar `start:dev`.
- O Prisma Client precisa ser regenerado sempre que o esquema muda; isso é automático no `npm install` e no `start:dev`, mas não no `npm run build` isolado.
- Os scripts de instalação de `prisma` e `@prisma/engines` estão aprovados em `allowScripts` no `package.json`, pois baixam o binário de migrações.
- CHECKs, índices de expressão, triggers, funções e views existem só no SQL das migrações (ver abaixo). Quem alterar o `schema.prisma` precisa conferir que a migração gerada não remove nenhum deles.

## Primeira migração (DEP01)

A equipe de banco aprovou o DER e entregou os scripts V1 a V11 no formato do Flyway (`V<n>__descricao.sql`). Eles foram convertidos para o formato do Prisma sem alterar o SQL:

- Cada script virou uma migração em `prisma/migrations/2026110500000<n>_v<n>_<descricao>/migration.sql`. O timestamp preserva a ordem de execução definida pela equipe de banco (a V6 depende da V4).
- O `schema.prisma` foi gerado por `prisma db pull` e renomeado para o padrão TypeScript (models em PascalCase, campos em camelCase, chave primária `id`, chaves estrangeiras `<entidade>Id`), com `@map` e `@@map` para os nomes do banco.
- Índices únicos parciais (`WHERE ativo`, `WHERE vigente`, `WHERE status = 'OFICIAL'`) usam o preview `partialIndexes` do Prisma. As relações afetadas foram mantidas 1:N, pois esses índices não tornam a relação 1:1.
- O Prisma não representa CHECKs, índices de expressão (`lower(nome)`, `lower(email)`), triggers, funções nem views. Eles ficam só nas migrações e o `prisma migrate diff` os ignora, sem tentar removê-los.
- Validação: `prisma migrate dev` sobre um banco criado só pelas migrações não gerou nenhuma mudança, e os testes manuais da equipe de banco (T3, T4 e T5, sobre a massa de desenvolvimento) tiveram o resultado esperado no PostgreSQL 18.

A massa de desenvolvimento da equipe de banco ainda não virou seed do Prisma (item 5 da estratégia); fica para uma tarefa própria, junto com um usuário administrador para testes de login.
