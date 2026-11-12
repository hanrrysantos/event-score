# US04 / T18 — Endpoints de eventos

A T18 liga as rotas do contrato aos métodos persistentes do `EventosService`
entregues na T20 (PR #24). Os DTOs e as regras da T16/T17 são reutilizados.

| Método e rota | Resposta | Operação |
| --- | --- | --- |
| `GET /api/v1/eventos` | 200, `EventoResumoDto[]` | Listagem ordenada pelo service; sem eventos, retorna `[]`. |
| `POST /api/v1/eventos` | 201, `EventoResumoDto` | Cria evento inativo. |
| `GET /api/v1/eventos/ativo` | 200, `EventoResumoDto` | Consulta o evento ativo; retorna 404 se não houver. |
| `GET /api/v1/eventos/{eventoId}` | 200, `EventoDetalheDto` | Inclui `temResultado`, calculado pelo service. |
| `PATCH /api/v1/eventos/{eventoId}` | 200, `EventoResumoDto` | Atualização parcial; campos ausentes são preservados e `null` é rejeitado. |
| `POST /api/v1/eventos/{eventoId}/ativar` | 200, `EventoResumoDto` | Troca transacional do evento ativo; chamada repetida é idempotente. |

Os IDs aceitam somente dígitos, de 1 a 2147483647, a faixa da chave `INTEGER`
no PostgreSQL. Valores inválidos retornam 400 antes de acessar o service.
Os corpos são validados pelo `ValidationPipe` global: campos desconhecidos,
inclusive `ativo`, `id` e `temResultado`, são rejeitados. As regras de domínio
continuam no service e os erros passam pelo filtro compartilhado da T09.

O Swagger em `/api/docs` documenta os corpos, parâmetros, respostas e Bearer.
Além de 400/401/404/422, a criação e a edição documentam 409 para conflitos
de unicidade de nome e ano já tratados pelo filtro global.

## Autenticação e dependência externa

A T14 (PR #25 / Taiga #194) registra o guard global quando
`AuthModule.register(...)` é importado. A T15 (PR #27 / Taiga #195) integrou
esse módulo em `AppModule` com o repositório real de usuários. A branch da T18
incorpora essa integração: as seis rotas agora exigem JWT de um administrador
ativo na aplicação principal. O bloqueio externo da T15 está resolvido.

Os testes desta task importam o `AuthModule` oficial com repositório de usuários
simulado e confirmam que as seis rotas herdam o guard global, aceitam JWT válido
e rejeitam token ausente ou inválido com 401. Nenhum repositório provisório é
usado na aplicação principal. A suíte `test/eventos-acesso.e2e-spec.ts` também
usa o `AppModule` real e PostgreSQL: valida 401 nas seis rotas, login com senha
Argon2id e acesso autenticado à listagem, criação e detalhe de eventos. Seus
dados têm UUID por execução e a limpeza usa somente os IDs criados.

## Cobertura e próximas entregas

Os testes HTTP da T18 usam o service simulado para verificar roteamento,
DTOs, parâmetros, status e propagação dos erros, incluindo a precedência
de `/ativo` sobre `/{eventoId}`. Os testes de Swagger verificam os schemas
efetivamente publicados. A persistência continua coberta pela suíte da T20.

A T19 / Taiga #183 acrescentará a integração HTTP com PostgreSQL e o login
real de forma abrangente, complementando a verificação de acesso desta task.
Os testes com banco devem usar exclusivamente
`TEST_DATABASE_URL`, conforme o README.

## Frontend e Taiga

Lista, formulário de cadastro/edição, seleção de evento ativo e detalhe podem
ser preparados a partir do contrato e testados localmente com estas rotas.
A integração autenticada pode ser iniciada após o merge da T18; o aceite
completo depende da T19. A T18 sozinha não
representa o aceite da US04 nem da gestão de eventos #226.

- T20 / #184: fechado após o merge do PR #24.
- T18 / #182: pronto para teste quando o PR sair de Draft após a CI verde.
- T19 / #183: novo; iniciar após o merge da T18.
- US04 / #179: em andamento.

As movimentações acima são orientações para atualização manual no Taiga.
