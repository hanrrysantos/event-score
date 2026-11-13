# US04 / T19 — Testes HTTP e integração de eventos

A T19 / Taiga #183 complementa as entregas T18 (PR #26), T20 (PR #24)
e T15 (PR #27) com a suíte `test/eventos-http.e2e-spec.ts`.
Os testes usam o `AppModule`, os DTOs, o guard, o filtro de erros e o
`EventosService` reais. O administrador é criado com senha Argon2id e o JWT
é obtido pelo endpoint de login, sem substituir essas dependências por mocks.

## Cobertura acrescentada

- Criação com 201, normalização do nome, evento inativo e datas sem horário.
- Listagem com ordenação e dados persistidos.
- PATCH parcial com 200, preservando identidade, campos ausentes e estado ativo.
- Violação real da unicidade de nome/ano: 409 na criação e edição, sem alterar
  o registro de destino quando a edição é recusada.
- Null nos cinco campos cadastrais, tipos incorretos e campos indevidos: 400,
  preservando os dados gravados.
- Período incoerente e quantidade incompatível: 422; revalidação do conjunto
  dos campos em atualizações parciais.
- Dias cadastrados: 422 ao reduzir o período ou a quantidade de forma inválida;
  ampliação do período aceita sem remover os dias.
- Ativação por HTTP com 200, troca do evento ativo e repetição idempotente.
- Evento inexistente: 404 nas três operações por ID; a ativação recusada
  preserva o evento ativo atual.
- Ausência de evento ativo: 404 na rota `/ativo`.
- `temResultado` verdadeiro quando há resultado ou apuração e falso em outro
  evento sem esses registros.
- JWT expirado e revogação do acesso de um administrador desativado: 401.

A T18 já cobre as seis rotas sem token ou com token inválido, validação dos IDs
e schemas Swagger. A T15 cobre os demais cenários do login. Essas suítes são
mantidas e executadas junto com a T19.

## Isolamento e execução

É obrigatório usar `TEST_DATABASE_URL` em um banco exclusivo, com o marcador
`test` no nome, conforme a proteção de `vitest.config.e2e.ts` e o README.
Todas as fixtures da T19 possuem identificação única; a limpeza restringe
eventos aos IDs criados e os relacionamentos a esses mesmos eventos.
O usuário de teste é removido pelo próprio ID.

Os testes de ativação alteram temporariamente o evento ativo nesse banco.
A T19 guarda seu ID original e o restaura depois da limpeza dos registros
criados. As suítes e2e agora executam em sequência (`fileParallelism: false`),
porque a regra de um único evento ativo é global: as suítes T19 e T20 não
podem testar a troca ou restaurar o estado ao mesmo tempo.
Não execute duas instâncias da suíte contra o mesmo banco de testes.

```bash
DATABASE_URL=postgresql://usuario:senha@localhost:5432/eventscore_test npm run db:deploy
TEST_DATABASE_URL=postgresql://usuario:senha@localhost:5432/eventscore_test npm run test:e2e
```

## Aceite, frontend e Taiga

A T19 não altera endpoints, regras de negócio nem o esquema do banco.
Após CI verde, revisão e merge desta task, a cobertura prevista para a US04
fica entregue. O aceite deve registrar os PRs T16, T17, T18, T19 e T20.

O frontend já pode integrar as rotas autenticadas disponíveis na main desde
a T18. Esta task amplia a evidência dos cenários de sucesso e erro consumidos
por lista, cadastro, edição, detalhe e seleção do evento ativo.
A validação da tela integrada e dos critérios da #226 continua separada.

- T18 / #182: fechado após o merge do PR #26.
- T19 / #183: em andamento; pronto para teste ao publicar o PR.
- US04 / #179: em andamento até o aceite e merge da T19.
- #226: conferir os critérios com o revisor para reaproveitar as entregas
  existentes; não criar código duplicado apenas para fechar a task.

As movimentações são orientações para atualização manual no Taiga.
