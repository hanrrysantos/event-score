# EventScore

O EventScore é um sistema para organizar e apurar resultados de eventos com desafios em grupo. Cada evento poderá configurar seus dias, grupos, desafios e regras de pontuação. A aplicação calculará a classificação dos grupos e a pontuação individual dos participantes.

Este repositório contém o backend e a API.

## Stack

- **Runtime e linguagem:** Node.js 24 e TypeScript (ES Modules)
- **Framework:** NestJS 12
- **Banco de dados:** PostgreSQL 18, via Docker Compose
- **ORM e migrações:** Prisma 7
- **Validação de ambiente:** Zod
- **Testes:** Vitest e Supertest
- **Qualidade:** oxlint, Prettier e GitHub Actions
- **Documentação da API:** OpenAPI/Swagger (planejado)

## Pré-requisitos

- [Node.js 24](https://nodejs.org/). Recomendado instalar via [nvm](https://github.com/nvm-sh/nvm), que lê a versão do arquivo `.nvmrc`
- [Docker](https://docs.docker.com/get-docker/) com Docker Compose
- Git

## Como rodar

```bash
# 1. Clonar e entrar no projeto
git clone git@github.com:hanrrysantos/event-score.git
cd event-score

# 2. Usar a versão correta do Node
nvm use

# 3. Instalar as dependências (também gera o Prisma Client)
npm ci

# 4. Criar o arquivo de ambiente local
cp .env.example .env
# Edite .env e configure JWT_SECRET (openssl rand -hex 32) e ADMIN_SENHA.
# O arquivo de exemplo não traz uma senha de administrador funcional.

# 5. Subir o PostgreSQL
docker compose up -d

# 6. Iniciar a API (aplica migrações pendentes e recarrega ao salvar)
npm run start:dev

# 7. Em outro terminal, popular o banco com a massa de desenvolvimento
npm run db:seed
```

O seed cria o evento Arena Comp 2026 (19 e 20/11), seus dois dias, os seis grupos, o fator de presença e o administrador definido em `ADMIN_*` no `.env`. Ele pode rodar várias vezes: insere só o que falta e não altera o que já existe, inclusive o administrador (para trocar a senha, use `npm run db:admin`). Para recomeçar do zero, use `npx prisma migrate reset` e rode o seed de novo.

### Administrador no servidor

Em homologação e produção não se usa o seed, que traz dados fictícios e se recusa a rodar com `NODE_ENV=production`. Depois do deploy, defina `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_SENHA` no ambiente e rode:

```bash
npm run db:admin
```

O `db:admin` e o seed recusam a senha pública que aparecia em versões anteriores do `.env.example`. O script usa a versão compilada em `dist/`, então não precisa das dependências de desenvolvimento. Se o e-mail já existir, ele **mantém a conta sem alterar a senha**. Para trocar a senha ou reativar um administrador existente, execute o comando com `ADMIN_ATUALIZAR_EXISTENTE=true` definido apenas nessa execução. Em produção, entregue as variáveis por um mecanismo seguro do ambiente, sem colocá-las no histórico do terminal ou em arquivos versionados. Se já criou o administrador com a antiga senha de exemplo, troque-a antes de usar o login.

A API exige `JWT_SECRET` com pelo menos 32 caracteres e falha ao iniciar se ele estiver ausente. Gere um segredo distinto por ambiente e guarde-o fora do Git. A troca do segredo invalida todos os tokens emitidos anteriormente. O acesso ocorre por `POST /api/v1/auth/login`; `GET /api/v1/auth/me` exige Bearer JWT. Os tokens expiram em uma hora. Apenas contas ativas com `perfil = ADMIN` podem autenticar-se, e não existe cadastro público.

Para conferir se está tudo funcionando:

```bash
curl localhost:3000/health
# {"status":"ok","info":{"database":{"status":"up"}},...}
```

### Depois de um `git pull`

Basta rodar `npm run start:dev` de novo: migrações novas são aplicadas e o Prisma Client é regenerado automaticamente. Se o `package-lock.json` mudou, rode `npm ci` antes.

## Scripts

| Script | O que faz |
|---|---|
| **Execução** | |
| `npm run start:dev` | Aplica migrações, gera o Prisma Client e inicia com recarga automática |
| `npm run start:debug` | Igual ao anterior, com o depurador do Node habilitado |
| `npm run build` | Compila para `dist/` |
| `npm run start:prod` | Executa a versão compilada (não aplica migrações) |
| **Qualidade** | |
| `npm run lint` | Verifica o código com oxlint |
| `npm run typecheck` | Verifica os tipos de todo o projeto, inclusive testes |
| `npm run format` | Formata o código com Prettier |
| `npm run format:check` | Verifica a formatação sem alterar arquivos |
| **Testes** | |
| `npm test` | Testes unitários |
| `npm run test:watch` | Testes unitários em modo observação |
| `npm run test:cov` | Testes unitários com relatório de cobertura |
| `npm run test:e2e` | Testes e2e (exigem `TEST_DATABASE_URL` apontando para um banco exclusivo) |
| **Banco de dados** | |
| `npm run db:migrate` | Cria uma migração a partir de mudanças no `schema.prisma` e aplica |
| `npm run db:deploy` | Aplica migrações pendentes |
| `npm run db:generate` | Gera o Prisma Client |
| `npm run db:studio` | Abre uma interface web para ver e editar os dados |
| `npm run db:seed` | Compila e popula o banco com a massa de desenvolvimento e o administrador |
| `npm run db:admin` | Cria o administrador; preserva contas existentes por padrão (exige `npm run build` antes) |

## Variáveis de ambiente

Definidas no `.env` (copiado de `.env.example`, nunca versionado). A aplicação valida as variáveis ao iniciar e não sobe se alguma estiver inválida.

| Variável | Usada por | Descrição |
|---|---|---|
| `NODE_ENV` | API | `development`, `test` ou `production` (padrão: `development`) |
| `PORT` | API | Porta HTTP (padrão: `3000`) |
| `DATABASE_URL` | API e Prisma | URL de conexão com o PostgreSQL |
| `JWT_SECRET` | API | Segredo de assinatura do JWT, obrigatório, com no mínimo 32 caracteres |
| `TEST_DATABASE_URL` | Testes e2e | URL explícita de um banco exclusivo cujo nome contenha `test` |
| `POSTGRES_USER` | Compose | Usuário do banco |
| `POSTGRES_PASSWORD` | Compose | Senha do banco |
| `POSTGRES_DB` | Compose | Nome do banco |
| `POSTGRES_PORT` | Compose | Porta exposta na sua máquina (padrão: `5432`) |
| `ADMIN_NOME` | Seed e `db:admin` | Nome do administrador |
| `ADMIN_EMAIL` | Seed e `db:admin` | E-mail de login do administrador (gravado em minúsculas) |
| `ADMIN_SENHA` | Seed e `db:admin` | Senha do administrador, com ao menos 12 caracteres; a antiga senha pública é recusada |
| `ADMIN_ATUALIZAR_EXISTENTE` | `db:admin` | Use `true` apenas quando quiser trocar a senha ou reativar uma conta existente |

`DATABASE_URL` deve usar o mesmo usuário, senha, porta e banco das variáveis `POSTGRES_*`.

Os testes e2e que alteram dados recusam a execução sem `TEST_DATABASE_URL` ou
quando o nome do banco não contém o marcador `test`. Crie e migre um banco
separado antes de executá-los, por exemplo:

```bash
createdb -h localhost -U eventscore eventscore_test
DATABASE_URL=postgresql://eventscore:eventscore@localhost:5432/eventscore_test npm run db:deploy
TEST_DATABASE_URL=postgresql://eventscore:eventscore@localhost:5432/eventscore_test npm run test:e2e
```

## Estrutura

```
├── .github/workflows/   # Pipeline de CI
├── docs/
│   └── adr/             # Registros de decisões técnicas
├── prisma/
│   ├── schema.prisma    # Models do Prisma Client (tabelas e relações)
│   └── migrations/      # Migrações SQL (V1 a V11 da equipe de banco; V12 em diante revisadas por ela)
├── src/
│   ├── main.ts          # Ponto de entrada
│   ├── app.module.ts    # Módulo raiz
│   ├── config/          # Validação das variáveis de ambiente
│   ├── prisma/          # PrismaService (acesso ao banco)
│   ├── health/          # GET /health
│   ├── modules/         # Módulos de domínio (eventos, grupos...)
│   ├── scripts/         # Seed de desenvolvimento e criação do administrador
│   └── generated/       # Prisma Client gerado (não versionado)
└── test/                # Testes e2e
```

## Contribuindo

Fluxo de trabalho, convenções de código, testes e migrações estão em [CONTRIBUTING.md](CONTRIBUTING.md).

## Decisões técnicas

As decisões de arquitetura ficam registradas em [`docs/adr/`](docs/adr/):

- [ADR 0001: Prisma como ORM e estratégia de migrações](docs/adr/0001-orm-prisma.md)
- [ADR 0003: Divergências entre o banco (V1 a V11) e o contrato da API](docs/adr/0003-divergencias-banco-contrato.md)

## Modelo de dados

DER aprovado pela equipe de banco (DEP01). A definição exata de tipos e restrições está nas migrações em `prisma/migrations/`; mudanças no modelo entram por migrações novas.

<p align="center">
  <img src="docs/der-eventscore.png" alt="Diagrama entidade-relacionamento do EventScore">
</p>
