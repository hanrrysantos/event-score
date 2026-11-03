# EventScore — Especificação OpenAPI e Política de Mudanças (US02 / T07)

Este diretório contém as especificações formais **OpenAPI 3.0.3** da API RESTful do **EventScore (Arena Comp 2026)** e a política oficial de versionamento e governança de contratos compartilhados entre as equipes de **Backend** e **Frontend**.

---

## 1. Versão Atual do Contrato: `v0.1.0` (Sprint 01)

A versão **`v0.1.0`** documenta o escopo fechado e aprovado da **Sprint 01 (S1)**, formalizado no documento [docs/contrato-api-t06.md](../contrato-api-t06.md) e alinhado com a versão **v0.3** do contrato do Frontend (aprovada em 29/10/2026 por Luiz Meneses).

### Arquivo da Especificação:
- [`openapi-v0.1.yaml`](./openapi-v0.1.yaml)

### Escopo de Endpoints da Sprint 01 (17 operações):
| Módulo | Método | Rota | Descrição |
|---|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/login` | Autenticação com e-mail/senha, retornando JWT e `expiraEm` UTC |
| **Auth** | `GET` | `/api/v1/auth/me` | Consulta do perfil do usuário autenticado via Bearer JWT |
| **Eventos** | `GET` | `/api/v1/eventos` | Listagem simples de eventos cadastrados |
| **Eventos** | `GET` | `/api/v1/eventos/ativo` | Consulta do evento atualmente ativo no sistema (RF02) |
| **Eventos** | `GET` | `/api/v1/eventos/{eventoId}` | Detalhes do evento, incluindo indicador `temResultado` |
| **Eventos** | `POST` | `/api/v1/eventos` | Criação de novo evento (inicia inativo) |
| **Eventos** | `PATCH` | `/api/v1/eventos/{eventoId}` | Atualização parcial de dados cadastrais do evento |
| **Eventos** | `POST` | `/api/v1/eventos/{eventoId}/ativar` | Ativação do evento com desativação do anterior (RF02) |
| **Dias** | `GET` | `/api/v1/eventos/{eventoId}/dias` | Listagem cronológica dos dias de competição |
| **Dias** | `POST` | `/api/v1/eventos/{eventoId}/dias` | Cadastro de dia de evento dentro do intervalo oficial |
| **Dias** | `PATCH` | `/api/v1/eventos/{eventoId}/dias/{diaId}` | Atualização da data ou número ordinal do dia |
| **Dias** | `DELETE` | `/api/v1/eventos/{eventoId}/dias/{diaId}` | Exclusão de dia (bloqueado se houver presenças ou desafios) |
| **Grupos** | `GET` | `/api/v1/eventos/{eventoId}/grupos` | Listagem dos grupos do evento com total de participantes |
| **Grupos** | `GET` | `/api/v1/eventos/{eventoId}/grupos/{grupoId}` | Consulta individual de um grupo |
| **Grupos** | `POST` | `/api/v1/eventos/{eventoId}/grupos` | Criação de grupo com nome e cor `#RRGGBB` (inicia com 0 participantes) |
| **Grupos** | `PATCH` | `/api/v1/eventos/{eventoId}/grupos/{grupoId}` | Atualização de grupo (bloqueado por RF03 se houver resultados) |
| **Grupos** | `DELETE` | `/api/v1/eventos/{eventoId}/grupos/{grupoId}` | Exclusão de grupo (bloqueado por RF03 se houver resultados) |

---

## 2. Convenções e Padrões Compartilhados

1. **URL Base e Prefixos:**
   - Servidor local padrão: `http://localhost:3000/api/v1`.
   - Rotas em português, kebab-case, no plural e sem acentuação (ex.: `/itens-bonificacao`).
   - Identificadores de caminho no padrão `{nomeId}` (ex.: `{eventoId}`, `{diaId}`, `{grupoId}`).
2. **Payloads e Atributos:**
   - Comunicação JSON estritamente em `camelCase`.
   - O banco de dados PostgreSQL utiliza `snake_case`, com conversão garantida na camada de serviço.
3. **Formatos de Data e Hora:**
   - Datas puras (sem horário): ISO 8601 estendido `YYYY-MM-DD` (ex.: `2026-11-20`).
   - Datas com horário: ISO 8601 em UTC `YYYY-MM-DDTHH:mm:ssZ` (ex.: `2026-11-23T22:38:00Z`).
4. **Envelopes e Listagens:**
   - Recursos individuais: retornam diretamente o objeto JSON.
   - Listas simples: retornam array direto `[...]`.
   - Listas com metadados/métricas: envelope `{ "dados": [...], "paginacao"?: {...}, "resumo"?: {...} }`.
5. **Segurança:**
   - Sessão via cabeçalho `Authorization: Bearer <token>` em todas as rotas privadas.
   - Apenas a rota `POST /auth/login` é pública (`security: []`).
6. **Formato Padrão de Erros (NestJS):**
   - Erros operacionais e regras de negócio (`401`, `404`, `409`, `422`):
     ```json
     {
       "statusCode": 404,
       "message": "Recurso não encontrado",
       "error": "Not Found"
     }
     ```
   - Erros de validação de formulários/DTOs (`400` disparado pelo `ValidationPipe`):
     ```json
     {
       "statusCode": 400,
       "message": [
         "email deve ser um endereço de e-mail válido",
         "senha não pode estar vazia"
       ],
       "error": "Bad Request"
     }
     ```

---

## 3. Política de Versionamento e Evolução de Contratos

Adotamos os princípios de **Versionamento Semântico (SemVer)** adaptados para contratos de API REST:

```
vMAJOR.MINOR.PATCH
```

### 3.1. Fase Inicial de Desenvolvimento (`0.x.y` — Sprints 01 e 02)
Durante a fase de construção das sprints iniciais, a API evolui rapidamente:
- **`0.x.0` (MINOR):** Acréscimo de novos módulos (ex.: Sprint 02 com Desafios, Presenças, Bonificações) ou ajustes estruturais aprovados previamente entre Backend e Frontend.
- **`0.x.y` (PATCH):** Correções de documentação, adição de exemplos realistas, refinamentos textuais de mensagens de erro ou ajustes de regras sem impacto retrocompatível.

### 3.2. Pós-Homologação (`>= 1.0.0`)
A partir da versão estável homologada:
- **`MAJOR` (Quebra de Compatibilidade):**
  - Remoção de qualquer rota existente.
  - Alteração de verbos HTTP ou renomeação de rotas.
  - Adição de novo campo obrigatório no corpo (`requestBody`) de rota existente.
  - Alteração de tipo primitivo de campos (ex.: string para número).
  - Remoção de propriedades de resposta consumidas pelos clientes.
  - Mudança de códigos de status de sucesso (ex.: 200 para 204).
- **`MINOR` (Evolução Retrocompatível):**
  - Adição de novos endpoints e recursos.
  - Adição de novos campos opcionais em requisições existentes.
  - Adição de novas propriedades informativas em corpos de resposta.
  - Inclusão de novos valores em enums nos quais o cliente já trate valores desconhecidos com tolerância.
- **`PATCH` (Correções e Ajustes Transparentes):**
  - Correção de bugs de especificação que não alterem a semântica de dados.
  - Melhorias e enriquecimento de descrições e mocks.

### 3.3. Tabela Comparativa de Mudanças:

| Tipo de Mudança | Exemplo Prático | Classificação | Ação Requerida |
|---|---|---|---|
| Adicionar novo endpoint | `GET /api/v1/eventos/{eventoId}/desafios` | **Compatível (MINOR)** | Incrementar versão MINOR |
| Adicionar campo opcional no body | `PATCH /eventos/{id}` aceita `descricao?` | **Compatível (MINOR)** | Atualizar DTOs e frontend |
| Adicionar campo novo na resposta | `GET /eventos` inclui `totalGrupos` | **Compatível (MINOR)** | Frontend ignora ou consome |
| Renomear campo existente | Renomear `dataInicio` para `inicio` | **Breaking Change (MAJOR)** | Exige alinhamento em Workshop e RFC |
| Tornar campo opcional em obrigatório | Tornar `ano` obrigatório no PATCH | **Breaking Change (MAJOR)** | Exige alteração coordenada no Frontend |
| Remover endpoint ou método | Deletar rota de exclusão | **Breaking Change (MAJOR)** | Exige transição planejada |

### 3.4. Fluxo de Governança para Mudanças de Contrato:
1. **Identificação da Necessidade:** Qualquer membro do Backend ou Frontend abre o apontamento no canal de integração do projeto.
2. **Registro de Decisão:** Caso aceito, o ajuste é registrado em documento de workshop (`docs/contrato-api-t*.md`).
3. **Atualização do OpenAPI:** O arquivo `docs/openapi/openapi-v*.yaml` é atualizado na branch correspondente.
4. **Revisão Cruzada Obrigatória (Pull Request):** O PR de alteração do contrato precisa obrigatoriamente de aprovação do líder de frontend e do líder de backend antes do início da implementação no código.

---

## 4. Guia Prático para o Frontend: Mocks e Validação

A especificação OpenAPI v0.1 foi concebida com **exemplos realistas em 100% dos schemas e respostas**, possibilitando ao time de Frontend desenvolver telas e componentes imediatamente, mesmo antes da implementação dos controllers e banco de dados.

### 4.1. Execução de Servidor de Mock com Prism (Recomendado)
O **Stoplight Prism** cria um servidor HTTP local simulando a API real a partir do arquivo OpenAPI, validando cabeçalhos e respondendo com os exemplos declarados.

Para iniciar o servidor de mock sem necessidade de instalação prévia:

```bash
# Executa o mock na porta 4010
npx -y @stoplight/prism-cli mock docs/openapi/openapi-v0.1.yaml -p 4010
```

#### Testando uma chamada mockada:
```bash
# Login mockado
curl -X POST http://localhost:4010/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@arena.com", "senha": "SenhaForte@2026"}'

# Consulta do evento ativo
curl -X GET http://localhost:4010/api/v1/eventos/ativo \
  -H "Authorization: Bearer mock-token"
```

#### Ativando validação rigorosa de requisições:
```bash
# Retorna erro 422 automaticamente caso o frontend envie payloads fora da especificação
npx -y @stoplight/prism-cli mock docs/openapi/openapi-v0.1.yaml -p 4010 --errors
```

---

### 4.2. Visualização Interativa no Swagger UI / Editor
1. **Via Web:** Acesse [https://editor.swagger.io](https://editor.swagger.io) e importe o arquivo `docs/openapi/openapi-v0.1.yaml`.
2. **Via VS Code / Antigravity IDE:**
   - Instale a extensão `OpenAPI (Swagger) Editor` ou `Swagger Viewer`.
   - Abra o arquivo `openapi-v0.1.yaml` e pressione `Shift + Alt + P` para visualizar a interface interativa.

---

### 4.3. Geração Automática de Tipos TypeScript e Clientes (Orval / MSW)
O frontend pode gerar tipos TypeScript e funções de fetch / React Query automaticamente a partir do OpenAPI.

#### Exemplo de configuração `orval.config.ts`:
```typescript
import { defineConfig } from 'orval';

export default defineConfig({
  eventScore: {
    input: '../event-score/docs/openapi/openapi-v0.1.yaml',
    output: {
      target: './src/api/generated/endpoints.ts',
      schemas: './src/api/generated/models',
      client: 'react-query',
      mock: true, // Gera handlers para MSW (Mock Service Worker)
    },
  },
});
```

Para gerar os arquivos:
```bash
npx -y orval
```

---

### 4.4. Validação e Linting do Arquivo OpenAPI (Spectral)
Para garantir que futuras alterações no YAML não introduzam violações de sintaxe ou de boas práticas da especificação OpenAPI 3.0:

```bash
npx -y @stoplight/spectral-cli lint docs/openapi/openapi-v0.1.yaml
```
