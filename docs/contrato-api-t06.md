# EventScore (Arena Comp 2026) — Registro do Workshop de Contrato API (T06)

**História:** US02 - Contrato API e padrões compartilhados  
**Data do Alinhamento Inicial:** 25/10/2026 (v0.2 com Luiz Meneses - Frontend)  
**Status Atual:** Aguardando validação final dos 4 itens abertos com o Frontend

---

## 1. Escopo Fechado da Sprint 01 (S1)
A Sprint 01 compreende os módulos fundamentais para viabilizar as primeiras telas do sistema:
- **Autenticação:** `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- **Eventos:** `GET /api/v1/eventos`, `GET /api/v1/eventos/ativo`, `GET /api/v1/eventos/{eventoId}`, `POST /api/v1/eventos`, `PATCH /api/v1/eventos/{eventoId}`, `POST /api/v1/eventos/{eventoId}/ativar`
- **Dias:** `GET /api/v1/eventos/{eventoId}/dias`, `POST /api/v1/eventos/{eventoId}/dias`, `PATCH /api/v1/eventos/{eventoId}/dias/{diaId}`
- **Grupos:** `GET /api/v1/eventos/{eventoId}/grupos`, `GET /api/v1/eventos/{eventoId}/grupos/{grupoId}`, `POST /api/v1/eventos/{eventoId}/grupos`, `PATCH /api/v1/eventos/{eventoId}/grupos/{grupoId}`, `DELETE /api/v1/eventos/{eventoId}/grupos/{grupoId}` (a confirmar)

---

## 2. Decisões Técnicas Alinhadas pelo Backend
1. **Convenção de URLs e Nomenclaturas:**
   - Prefixo global: `/api/v1`
   - Recursos no plural, kebab-case e sem acentos (ex.: `/itens-bonificacao`)
   - Identificadores de rota no formato `{nomeId}` (ex.: `{eventoId}`)
   - Payload JSON em `camelCase`
   - Datas sem hora em ISO-8601 `YYYY-MM-DD` e com hora em UTC ISO-8601 (`YYYY-MM-DDTHH:mm:ssZ`)
2. **Critérios de Desempate (Enum):**
   - Valores permitidos: `MAIOR_PONTUACAO_DESAFIO` (requer `desafioId`), `MAIOR_SOMA_DESAFIOS`, `MAIOR_BONIFICACAO`, `MENOR_PENALIDADE`, `MAIOR_PRESENCA`.
3. **Idempotência (RNF04):**
   - Endpoints `PUT` (presença, bônus e resultados de desafio) são estritamente idempotentes via transação e `upsert`.
4. **Tratamento de Erros:**
   - Envelope nativo do NestJS: `{ statusCode, message, error }`.
   - Códigos: `400` (Validação DTO), `401` (Não autenticado), `404` (Não encontrado), `409` (Conflito de estado), `422` (Regra de negócio).

---

## 3. Itens Encaminhados para Validação do Frontend (Pendências em Aberto)
- [ ] **Item 1:** Formato de envelope para listas que possuem resumo (ex.: `GET /presencas` com `{ dados: [...], resumo: {...} }`).
- [ ] **Item 2:** Inclusão de `id` nos itens de `GET /desafios/{desafioId}/resultados` para permitir filtro no botão "Histórico" da Auditoria.
- [ ] **Item 3:** Inclusão da rota `DELETE /eventos/{eventoId}/grupos/{grupoId}` no escopo da Sprint 01 (`S1`).
- [ ] **Item 4:** Necessidade de rota para exclusão de dia cadastrado errado (`DELETE /eventos/{eventoId}/dias/{diaId}`).
