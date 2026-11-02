# US6 — integração de autenticação

As rotas de `DiasEventoController` já estão documentadas com `Bearer JWT` por
meio de `@ApiBearerAuth()`. A `main` desta branch ainda não contém o módulo de
autenticação nem um guard funcional; por isso, não foi inventado um guard local
que duplicaria a US03.

Ponto exato de integração antes do merge:

1. aplicar o guard aprovado pela US03 no controller ou globalmente;
2. manter `POST /api/v1/auth/login` como rota pública;
3. proteger as quatro rotas de `/eventos/:eventoId/dias`;
4. adicionar testes e2e com token válido, ausente e inválido.

Enquanto a US03 não estiver integrada na `main`, os testes unitários da US6
validam o domínio com `PrismaService` mockado, sem depender de autenticação.
