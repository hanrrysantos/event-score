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
`AuthModule.register(...)` é importado. A integração desse módulo em
`AppModule`, com o repositório real de usuários, pertence à T15 / Taiga #195.
Na base desta entrega, essa integração ainda está pendente. Portanto, as
rotas na aplicação principal ainda não exigem autenticação, mesmo com Bearer
documentado. A T18 não está liberada para exposição em homologação ou produção
até a T15 ativar e validar essa proteção na aplicação principal.

Os testes desta task importam o `AuthModule` oficial com repositório de usuários
simulado e confirmam que as seis rotas herdam o guard global, aceitam JWT válido
e rejeitam token ausente ou inválido com 401. Nenhum repositório provisório é
usado na aplicação principal.

## Cobertura e próximas entregas

Os testes HTTP da T18 usam o service simulado para verificar roteamento,
DTOs, parâmetros, status e propagação dos erros, incluindo a precedência
de `/ativo` sobre `/{eventoId}`. Os testes de Swagger verificam os schemas
efetivamente publicados. A persistência continua coberta pela suíte da T20.

A T19 / Taiga #183 acrescentará a integração HTTP com PostgreSQL e o login
real após a T15. Os testes com banco devem usar exclusivamente
`TEST_DATABASE_URL`, conforme o README.

## Frontend e Taiga

Lista, formulário de cadastro/edição, seleção de evento ativo e detalhe podem
ser preparados a partir do contrato e testados localmente com estas rotas.
A integração autenticada completa depende de T15 e T19; a T18 sozinha não
representa o aceite da US04 nem da gestão de eventos #226.

- T20 / #184: fechado após o merge do PR #24.
- T18 / #182: em andamento enquanto o PR estiver em Draft; pronto para teste
  quando for liberado para revisão após a integração da T15.
- T19 / #183: novo; fechamento depende da autenticação real.
- US04 / #179: em andamento.

As movimentações acima são orientações para atualização manual no Taiga.
