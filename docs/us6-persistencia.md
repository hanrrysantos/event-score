# US6: limite de persistência

## Responsabilidades

- `PrismaService` e o client gerado são usados pelo runtime da US6 para consultar
  e alterar somente `evento` e `dia_evento`.
- `prisma/schema.prisma` é uma projeção parcial dessas tabelas para o client.
  Ele não representa todas as tabelas da base oficial.
- A criação e a evolução da base oficial continuam sendo responsabilidade dos
  scripts SQL V1 a V11 da equipe de banco.
- A migration `prisma/migrations/20261102000000_t26_evento_dia_evento` serve para
  instalação limpa local e CI da fundação Prisma. Ela não substitui V1 a V11.

## Uso permitido

Em uma base limpa destinada ao backend e aos testes da US6:

```bash
DATABASE_URL=... npm run db:deploy
DATABASE_URL=... npm run db:generate
```

Em uma base oficial já criada por V1 a V11, configure apenas `DATABASE_URL` e
execute a aplicação/testes. O runtime da US6 pode operar sobre as tabelas
compatíveis já existentes, sem executar a migration Prisma.

## Comandos proibidos na base oficial

Não executar contra a base oficial:

- `npm run db:migrate`;
- `npm run db:deploy`;
- `prisma db push`;
- `prisma migrate reset`;
- SQL gerado por `prisma migrate diff --script`.

O schema Prisma parcial produziria operações destrutivas para tabelas oficiais
que ainda não estão modeladas. A compatibilidade deve ser avaliada por SQL
revisado pela equipe de banco, não por `IF NOT EXISTS`.

## Dependências da exclusão

O endpoint DELETE só retorna `204` depois de verificar `presenca` e `desafio`.
Se essas estruturas não existirem, retorna `503` sem expor nomes internos ou
detalhes do banco. Se existirem registros associados, retorna `409`. Outros
erros de consulta não são convertidos para `503`.

Esta delimitação permanece pendente de validação da DEP01 antes do merge.
