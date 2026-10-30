# EventScore (Arena Comp 2026) — Registro do Workshop de Contrato API (T06)

**História:** US02 - Contrato API e padrões compartilhados  
**Data do Alinhamento Inicial:** 25/10/2026  
**Data do Fechamento Final:** 29/10/2026 (Versão 0.3 aprovada por Luiz Meneses - Frontend)  
**Status:** Concluído e Aprovado  

---

## 1. Escopo Oficial da Sprint 01 (16 Endpoints S1)
Ficou acordado que a Sprint 01 entrega os 4 módulos essenciais com CRUD completo, viabilizando as telas 1, 2 e 4:
- **Autenticação (2 rotas):** `POST /api/v1/auth/login`, `GET /api/v1/auth/me`
- **Gestão de Eventos (6 rotas):** `GET /api/v1/eventos`, `GET /api/v1/eventos/ativo`, `GET /api/v1/eventos/{eventoId}`, `POST /api/v1/eventos`, `PATCH /api/v1/eventos/{eventoId}`, `POST /api/v1/eventos/{eventoId}/ativar`
- **Dias do Evento (4 rotas):** `GET /api/v1/eventos/{eventoId}/dias`, `POST /api/v1/eventos/{eventoId}/dias`, `PATCH /api/v1/eventos/{eventoId}/dias/{diaId}`, `DELETE /api/v1/eventos/{eventoId}/dias/{diaId}`
- **Grupos do Evento (4 rotas):** `GET /api/v1/eventos/{eventoId}/grupos`, `GET /api/v1/eventos/{eventoId}/grupos/{grupoId}`, `POST /api/v1/eventos/{eventoId}/grupos`, `PATCH /api/v1/eventos/{eventoId}/grupos/{grupoId}`, `DELETE /api/v1/eventos/{eventoId}/grupos/{grupoId}`

---

## 2. Decisões Técnicas Alinhadas e Fechadas (29/10/2026)
1. **Convenções Gerais:**
   - Prefixo: `/api/v1`
   - Rotas em português, kebab-case, no plural e sem acentos (ex.: `/itens-bonificacao`).
   - Identificadores de rota no formato `{nomeId}` (ex.: `{eventoId}`).
   - Payload JSON em `camelCase`. Banco de dados em `snake_case` (conversão feita na camada de serviço).
   - Datas sem hora: ISO 8601 (`YYYY-MM-DD`). Datas com hora: ISO 8601 em UTC (`YYYY-MM-DDTHH:mm:ssZ`).
2. **Formato Padrão de Resposta e Envelopes:**
   - Recursos individuais: retornam o próprio objeto JSON diretamente.
   - Listas simples: retornam array direto `[...]`.
   - Listas com metadados ou métricas (participantes, frequência, classificação e apuração): retornam objeto envelope `{ "dados": [...], "paginacao"?: {...}, "resumo"?: {...} }`.
3. **Idempotência e Conexão Intermitente (RNF04):**
   - Todos os endpoints `PUT` (frequência, bônus e resultados de desafios) são estritamente idempotentes via substituição transacional / `upsert`.
4. **Histórico e Auditoria (RF18):**
   - O endpoint `GET .../resultados` devolve o campo `id` (ou `null` se ainda não lançado), e o `PUT` preserva a mesma chave primária, permitindo consulta pontual na auditoria via `entidade + registroId`.
5. **Critérios de Desempate (RF13):**
   - Enum fechado: `MAIOR_PONTUACAO_DESAFIO` (exige `desafioId`), `MAIOR_SOMA_DESAFIOS`, `MAIOR_BONIFICACAO`, `MENOR_PENALIDADE`, `MAIOR_PRESENCA`.
6. **Autenticação:**
   - Retorno do login inclui `expiraEm` no formato ISO 8601 UTC.
   - Sessão gerenciada por token JWT no cabeçalho `Authorization: Bearer <token>`.
7. **Códigos de Status HTTP e Formato de Erros:**
   - Envelope padrão NestJS: `{ "statusCode": number, "message": string | string[], "error": string }`.
   - `200`: Sucesso de leitura ou alteração.
   - `201`: Criação de novo recurso (`POST`).
   - `204`: Exclusão bem-sucedida sem corpo (`DELETE`).
   - `400`: Erro de sintaxe ou campo inválido disparado pelo `ValidationPipe`.
   - `401`: Token ausente, inválido ou login incorreto.
   - `404`: Recurso não encontrado ou pertencente a outro evento.
   - `409`: Conflito de estado (ex.: tentar editar ou excluir grupo que já tem resultado lançado, ou excluir dia com presença).
   - `422`: Violação de regra de negócio (ex.: data fora do período do evento, colocação repetida).
