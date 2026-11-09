# Sprint 01 — Registro de implementação

Registro do que foi implementado no backend durante a Sprint 01. Este documento é
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
| `create(eventId, dto)` | valida evento e mapeia duplicidade (`P2002` → 409) |
| `update(eventId, groupId, dto)` | valida vínculo e mapeia bloqueio pós-resultado (`P2003` → 409) |
| `remove(eventId, groupId)` | recusa exclusão com participantes (409) e mapeia bloqueio (`P2003` → 409) |

Decisões registradas em [`docs/adr/0002-bloqueio-grupos-apos-resultado.md`](adr/0002-bloqueio-grupos-apos-resultado.md).

### T25 — Persistência

- Sem migração nova: os models `Evento`, `Grupo` e `Participante` vieram no merge
  da T03 (migrações V1–V11).
- O serviço usa o `PrismaService` global com a chave composta `{ id, eventoId }`
  para garantir o isolamento por evento.

### Testes unitários (Onda 1)

| Arquivo | Cobertura |
|---|---|
| `grupos.service.spec.ts` | regras de 404/409, mapeamento `P2002`/`P2003`, fluxos de list/create/update/remove |
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
| `grupos.service.spec.ts` | unitário | regras 404/409, `P2002`/`P2003`, mapeamento do resumo |
| `dto/criar-grupo.dto.spec.ts` | unitário | validação `nome`/`cor` |
| `grupos.module.spec.ts` | unitário | wiring sem banco |
| `test/grupos.e2e-spec.ts` | e2e | 200, 201, 204, 400 (payload e id), 404, 409 |

---

## Pendências

- **401 (guard)** — depende da US03 / T14 (JWT e guard). O controller já declara
  `@ApiBearerAuth()`, mas ainda não há guard aplicado.
- **T09 (tratamento de erros)** — pode evoluir o mapeamento `P2002`/`P2003` para
  um filtro global de exceções.
- **#201 Grupos** — história do Taiga que fecha a US05 com o front-end (revisão do
  contrato e integração).
