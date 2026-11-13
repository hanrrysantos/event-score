# Sprint 06 — Registro de implementação

Registro do que foi implementado no backend durante a Sprint 06. Este documento é
atualizado a cada onda entregue; as tarefas seguem a numeração do Taiga.

- **Período:** 05 a 15/11/2026 · Homologação em 16/11/2026
- **História de referência:** US05 · Cadastro e consulta de grupos (RF03)
- **Branch:** `feat/US05-cadastro-e-consulta-de-grupos`
- **Responsável:** Lucas · **Revisor:** Ikki

## Convenções aplicadas

- Funções, métodos, variáveis e constantes em inglês. Propriedades de DTOs e
  parâmetros de rota seguem o contrato OpenAPI T06 (`nome`, `cor`,
  `quantidadeParticipantes`, `eventoId`, `grupoId`).
- Toda implementação acompanhada de testes unitários (`*.spec.ts`).
- Detalhes em [`CONTRIBUTING.md`](../CONTRIBUTING.md).

---

## Onda 1 — T21, T22 e T25 (05 a 07/11)

Módulo de grupos criado com DTOs, regras de negócio e persistência. Endpoints
(T23) e testes e2e (T24) ficam para a Onda 2.

### T21 — Módulo e DTOs

| Arquivo | Conteúdo |
|---|---|
| `src/modules/grupos/grupos.module.ts` | `GruposModule` (controller + service) |
| `src/modules/grupos/grupos.controller.ts` | `@Controller('eventos/:eventoId/grupos')` com `@ApiTags('Grupos')` e `@ApiBearerAuth()` (skeleton) |
| `src/modules/grupos/dto/criar-grupo.dto.ts` | `CriarGrupoDto`: `nome` (1–50) e `cor` (`#RRGGBB`) |
| `src/modules/grupos/dto/atualizar-grupo.dto.ts` | `AtualizarGrupoDto` (`PartialType`, campos opcionais) |
| `src/modules/grupos/dto/grupo-resumo.dto.ts` | `GrupoResumoDto`: `id`, `nome`, `cor`, `quantidadeParticipantes` |

### T22 — Regras de negócio

Implementadas em `src/modules/grupos/grupos.service.ts`:

| Método | Regra |
|---|---|
| `list(eventId)` | valida evento existente (404) e lista com contagem de participantes |
| `findById(eventId, groupId)` | valida isolamento por evento (404) |
| `create(eventId, dto)` | valida evento; duplicidade (`P2002`) vira 409 no filtro global |
| `update(eventId, groupId, dto)` | valida vínculo; bloqueio pós-resultado (`P2003`) vira 409 no filtro global |
| `remove(eventId, groupId)` | recusa exclusão com participantes (409); bloqueio pós-resultado no filtro global |

Decisões registradas em [`docs/adr/0002-bloqueio-grupos-apos-resultado.md`](adr/0002-bloqueio-grupos-apos-resultado.md).

### T25 — Persistência

- Sem migração nova: os models `Evento`, `Grupo` e `Participante` vieram no merge
  da T03 (migrações V1–V11).
- O serviço usa o `PrismaService` global com a chave composta `{ id, eventoId }`
  para garantir o isolamento por evento.

### Testes unitários (Onda 1)

| Arquivo | Cobertura |
|---|---|
| `grupos.service.spec.ts` | regras de 404/409 e fluxos de list/create/update/remove |
| `dto/criar-grupo.dto.spec.ts` | validação dos campos `nome` e `cor` (contrato) |
| `grupos.module.spec.ts` | wiring do módulo sem acesso ao banco |

---

## Onda 2 — T23 e T24 (08 e 09/11)

Endpoints HTTP expostos e cobertos por testes unitários e e2e. O controller
deixou de ser skeleton e agora usa o `GruposService`.

### T23 — Endpoints

`src/modules/grupos/grupos.controller.ts`, em `/api/v1/eventos/{eventoId}/grupos`:

| Método | Rota | Status | Descrição |
|---|---|---|---|
| `GET` | `/eventos/{eventoId}/grupos` | 200 | lista (array direto de `GrupoResumoDto`) |
| `POST` | `/eventos/{eventoId}/grupos` | 201 | cria grupo |
| `GET` | `/eventos/{eventoId}/grupos/{grupoId}` | 200 | consulta detalhe |
| `PATCH` | `/eventos/{eventoId}/grupos/{grupoId}` | 200 | atualiza parcialmente |
| `DELETE` | `/eventos/{eventoId}/grupos/{grupoId}` | 204 | exclui |

- Params numéricos validados com `ParseIntPipe` (400 em valor não numérico).
- O serviço agora retorna `GrupoResumoDto` (o `_count.participantes` é mapeado
  para `quantidadeParticipantes` via `toSummary`).

### T24 — Testes

| Arquivo | Tipo | Cobertura |
|---|---|---|
| `grupos.service.spec.ts` | unitário | regras 404/409 e mapeamento do resumo |
| `dto/criar-grupo.dto.spec.ts` | unitário | validação `nome`/`cor` |
| `grupos.module.spec.ts` | unitário | wiring sem banco |
| `test/grupos-persistencia.e2e-spec.ts` | integração (banco real) | criar/listar/consultar/atualizar/excluir, 404, isolamento, 409 |
| `test/grupos-acesso.e2e-spec.ts` | e2e HTTP | 401 (guard), fluxo CRUD, 400, 404, 409 (duplicidade) |

### Adaptação à T15 e T09 (após merge do guard)

- O `401` passou a ser aplicado pelo guard global (`JwtAuthGuard` via `APP_GUARD`):
  o controller declara `@ApiBearerAuth()` e `@ApiUnauthorizedResponse`, sem
  `@UseGuards` explícito.
- O mapeamento de erros do Prisma (`P2002`/`P2003`, incluindo o bloqueio RF03)
  saiu do `GruposService` e ficou centralizado no `HttpExceptionFilter` (T09).

---

## Onda 3 — #203 Participantes (RF04)

Módulo de participantes com listagem paginada e importação em duas etapas
(prévia e confirmação) a partir de arquivo CSV.

### Fluxo de importação (RF04)

| Método | Rota | Status | Descrição |
|---|---|---|---|
| `GET` | `/eventos/{eventoId}/participantes` | 200 | listagem (envelope `dados`/`paginacao`/`resumo`) |
| `POST` | `/eventos/{eventoId}/participantes/importacao` | 200 | prévia (não persiste): `totalLinhas`, `validas`, `invalidas`, `erros` |
| `POST` | `/eventos/{eventoId}/participantes/importacao/confirmar` | 201 | persiste as linhas válidas |

- Arquivo CSV com cabeçalho `nome,matricula,turma,grupo`; `grupo` é o **nome** do
  grupo (validado contra os grupos do evento).
- Validações por linha: `nome` (obrigatório, ≤150), `matricula` (obrigatória,
  ≤20, única por evento e no arquivo), `turma` (obrigatória, ≤10), `grupo`
  (obrigatório e existente no evento).
- Parsing com `csv-parse` (dependência nova).
- Upload via `FileInterceptor` (multer) e persistência em transação.

### Arquivos

| Arquivo | Conteúdo |
|---|---|
| `src/modules/participantes/participantes.module.ts` | `ParticipantesModule` |
| `src/modules/participantes/participantes.controller.ts` | rotas de listagem e importação |
| `src/modules/participantes/participantes.service.ts` | regras, `parseCsv` e `validateRows` |
| `src/modules/participantes/dto/participante-resumo.dto.ts` | `ParticipanteResumoDto` |
| `src/modules/participantes/dto/importacao.dto.ts` | prévia, confirmação e erro por linha |

### Testes

| Arquivo | Tipo | Cobertura |
|---|---|---|
| `participantes.service.spec.ts` | unitário | listagem, prévia, validações, confirmação |
| `participantes.module.spec.ts` | unitário | wiring sem banco |
| `test/participantes-persistencia.e2e-spec.ts` | integração | listar/importar, duplicidade, grupo inexistente |
| `test/participantes-acesso.e2e-spec.ts` | e2e HTTP | 401, upload multipart, 400, 404 |

---

## Pendências

- **#201 Grupos** — história do Taiga que fecha a US05 com o front-end (revisão do
  contrato e integração da tela).
- **#203 Participantes** — história do Taiga; contrato OpenAPI v0.2 ainda não
  publicado (rotas definidas provisoriamente aqui).
- **Revisão e merge** — abrir PR para a `main` e aprovação do revisor (Ikki).
