# EventScore: front-end

Telas do EventScore (Arena Comp 2026) em React + Vite + TypeScript. Consome a API em `/api/v1`, conforme o contrato v0.3 e o `docs/openapi/`.

## Como rodar

```bash
cd web
npm ci

# Terminal 1: mock da API a partir do OpenAPI (porta 4010)
npm run mock

# Terminal 2: front em http://localhost:5173
npm run dev
```

No mock, entre com o exemplo do OpenAPI: `admin@arena.com` / `SenhaForte@2026`.

O mock usa [`mock/openapi-mock.yaml`](mock/openapi-mock.yaml): as rotas da Sprint 01 vêm por referência do OpenAPI oficial (`docs/openapi/`), e as que o back-end ainda não publicou (configuração, desafios...) seguem o contrato front x API v0.3. Quando o back-end publicar uma rota no OpenAPI oficial, troque a cópia daqui pela referência.

Para usar o back-end real (`npm run start:dev` na raiz), rode o front com `API_URL`:

```bash
API_URL=http://localhost:3000 npm run dev
```

## Scripts

| Script | O que faz |
|---|---|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Verifica os tipos e gera `dist/` |
| `npm run lint` | oxlint |
| `npm test` | Testes das regras puras (`*.test.ts`), com o executor de testes do próprio Node |
| `npm run mock` | Mock da API com Prism, a partir do OpenAPI |
| `npm run api:tipos` | Regera `src/api/schema.d.ts` quando o OpenAPI mudar |

## Estrutura

```
src/
├── api/          # cliente HTTP (token, erros do NestJS) e tipos gerados do OpenAPI
├── components/   # layout com a navegação
└── pages/        # uma pasta/arquivo por tela
```
