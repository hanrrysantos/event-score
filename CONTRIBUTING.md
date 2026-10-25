# Contribuindo com o EventScore

Guia de trabalho para o time de backend. Para instalar e rodar o projeto, veja o [README](README.md).

## Fluxo de trabalho

1. Cada task do Taiga tem sua própria branch, criada a partir da `main` atualizada:
   ```bash
   git checkout main
   git pull
   git checkout -b feat/t16-modulo-eventos
   ```
   Formato: `<tipo>/t<número>-<descricao-curta>`, com o mesmo `tipo` dos commits.
2. Faça commits pequenos e coesos (veja [Commits](#commits)).
3. Abra um PR para a `main` com a descrição do que foi feito, como testar e o critério de aceite da task.
4. O merge só acontece com a **CI verde** e **1 aprovação** de outro integrante.
5. Depois do merge, apague a branch.

Nunca faça push direto na `main`.

## Commits

Seguimos [Conventional Commits](https://www.conventionalcommits.org/pt-br/), em português:

```
<tipo>(<escopo opcional>): <descrição no imperativo>
```

| Tipo | Quando usar | Exemplo |
|---|---|---|
| `feat` | Nova funcionalidade | `feat(eventos): validar período do evento` |
| `fix` | Correção de bug | `fix(prisma): permitir prisma generate sem DATABASE_URL definida` |
| `test` | Testes | `test(config): cobrir validação das variáveis de ambiente` |
| `docs` | Documentação | `docs(adr): registrar decisão sobre evento ativo` |
| `chore` | Configuração, dependências, ferramentas | `chore(deps): adicionar @nestjs/swagger` |
| `ci` | Pipeline | `ci: adicionar etapa de testes e2e` |
| `refactor` | Mudança de código sem alterar comportamento | `refactor(grupos): extrair validação de cor` |

Cada commit deve representar uma mudança lógica. Evite tanto um commit por arquivo quanto um único commit com a task inteira.

## Convenções de código

### Módulos

Módulos de domínio ficam em `src/modules/<nome>/`. Infraestrutura compartilhada fica fora: `src/config`, `src/prisma`, `src/health` e, futuramente, `src/common`.

Para criar um módulo:

```bash
npx nest g resource modules/eventos
```

O comando cria controller, service, DTOs e testes e registra o módulo no `app.module.ts`. Depois de gerar:

1. Rode `npm run format`: o código gerado não segue o padrão do Prettier e a CI recusaria.
2. Apague a pasta `entities/`: com Prisma, os tipos vêm do client gerado.
3. Não faça commit da alteração no `package.json` que adiciona `@nestjs/mapped-types` com versão `*`. Use o `PartialType` de `@nestjs/swagger` nos DTOs de atualização.

### Imports

O projeto usa ES Modules. Imports internos **precisam** terminar em `.js`, mesmo em arquivos `.ts`:

```ts
import { EventosService } from './eventos.service.js'; // correto
import { EventosService } from './eventos.service';    // não compila
```

### Acesso ao banco

O `PrismaModule` é global. Basta injetar o `PrismaService`:

```ts
@Injectable()
export class EventosService {
  constructor(private readonly prisma: PrismaService) {}

  listar() {
    return this.prisma.evento.findMany();
  }
}
```

### Configuração

O `ConfigModule` é global. Injete o `ConfigService` tipado:

```ts
constructor(private readonly config: ConfigService<Env, true>) {}

this.config.get('PORT', { infer: true }); // number
```

Para adicionar uma variável de ambiente:

1. Inclua no schema em `src/config/env.ts`.
2. Inclua no `.env.example` com um valor de desenvolvimento.
3. Avise o time: cada um precisa atualizar o próprio `.env`.

Nunca coloque credenciais reais em arquivos versionados.

## Testes

Usamos **Vitest**. A API é quase igual à do Jest, mas mocks usam `vi` em vez de `jest`:

```ts
const prismaMock = { evento: { findMany: vi.fn() } };
```

| Tipo | Onde fica | O que testar | Comando |
|---|---|---|---|
| Unitário | Ao lado do arquivo testado (`*.spec.ts`) | Regras de negócio e cálculos, com dependências mockadas | `npm test` |
| E2E | `test/` (`*.e2e-spec.ts`) | Contrato HTTP: status, payloads, autenticação (401) e validação (400) | `npm run test:e2e` |

A maior parte dos testes deve ser unitária, principalmente nos cálculos de pontuação. Os testes e2e cobrem o que só existe na camada HTTP: guards, pipes de validação e formato de erro.

## Migrações

O `prisma/schema.prisma` é a fonte de verdade do banco. Detalhes no [ADR 0001](docs/adr/0001-orm-prisma.md).

Para alterar o esquema:

1. Edite o `prisma/schema.prisma`.
2. Rode `npm run db:migrate` e dê um nome descritivo quando solicitado (ex.: `adicionar_cor_grupo`).
3. Faça commit do `schema.prisma` **junto** com a nova pasta em `prisma/migrations/`.
4. No PR, peça revisão do `migration.sql` à equipe de banco.

Regras:

- **Nunca edite uma migração já aplicada.** Para corrigir, crie uma nova.
- Restrições que o Prisma não expressa (ex.: `CHECK`) são escritas à mão: `npx prisma migrate dev --create-only`, edite o `migration.sql` gerado e depois rode `npm run db:migrate`.
- Nenhum SQL é aplicado no banco fora das migrações.

## Antes de abrir o PR

Rode o mesmo que a CI:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run test:e2e
```

Se a formatação falhar, `npm run format` corrige.

## Decisões técnicas (ADR)

Decisões caras de reverter são registradas em `docs/adr/`, numeradas em sequência (`0002-...md`), com as seções **Contexto**, **Opções consideradas**, **Decisão** e **Consequências**.

Exemplos de decisões que merecem ADR: regra de evento ativo, bloqueio de edição de grupos após resultados, critérios de desempate, algoritmo de hash de senha.

Um ADR aceito não é editado: se a decisão mudar, crie um novo ADR que o substitui e atualize o status do antigo.
