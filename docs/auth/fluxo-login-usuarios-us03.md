# US03 / Taiga #191 — Fluxo de login e usuários

**Status:** fluxo implementado no backend; alinhamento com Front-end e contrato permanece pendente.

**Escopo:** definição do fluxo de autenticação de administradores.

**Contrato de API:** mantido por outro integrante; este documento registra os requisitos da US03 para posterior incorporação ao contrato e ao OpenAPI.

## 1. Decisões estabelecidas

| Tema                  | Definição                                                                                                                                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quem acessa o sistema | Somente administradores. Não há acesso de alunos nem cadastro público de usuários.                                                                                                                      |
| Perfil                | O campo `perfil` permanece no modelo, mas a aplicação admite somente `ADMIN` para autenticação e para a criação de administradores.                                                                     |
| Credenciais           | O login recebe `email` e `senha`. O e-mail é consultado sem diferenciar maiúsculas de minúsculas.                                                                                                       |
| Conta inativa         | Uma conta com `ativo = false` não pode autenticar-se.                                                                                                                                                   |
| Senha                 | A persistência deve guardar somente hash; a verificação usa Argon2id. Senha e hash não aparecem nas respostas da API.                                                                                   |
| Sessão                | A API usa JWT no cabeçalho `Authorization: Bearer <token>`. O token de acesso expira em **1 hora**. O retorno do login inclui `expiraEm` em ISO 8601 UTC, correspondente ao instante real de expiração. |
| Administrador inicial | Um comando/seed controlado cria a conta, recebendo a senha por variável de ambiente local e persistindo somente o hash.                                                                                 |
| Erro de autenticação  | Usuário inexistente, senha incorreta, conta inativa e perfil não autorizado recebem HTTP 401 com mensagem genérica.                                                                                     |

Essas regras estão implementadas no backend pelas tasks #192 a #195. O contrato/OpenAPI de outro integrante ainda precisa refletir a política exclusiva de `ADMIN`.

## 2. Fluxo de autenticação

1. O administrador envia e-mail e senha para `POST /api/v1/auth/login`.
2. A API valida o formato do corpo. Dados inválidos resultam em HTTP 400.
3. A API procura o usuário pelo e-mail normalizado, verifica se a conta está ativa e se o perfil é `ADMIN`.
4. A API compara a senha recebida com o hash armazenado. Qualquer falha de credenciais ou autorização nesta etapa resulta em HTTP 401, sem indicar qual condição falhou.
5. Em caso de sucesso, a API emite um JWT e devolve o token, o instante de expiração e os dados públicos do administrador.
6. Nas rotas protegidas, o cliente envia o JWT como Bearer token. Token ausente, inválido ou expirado resulta em HTTP 401.
7. `GET /api/v1/auth/me` usa o token para identificar o administrador e devolver seus dados públicos.

Não há endpoint de cadastro público. A criação inicial do administrador é um processo controlado, separado do login.

## 3. Interface HTTP a alinhar com o contrato da API

As rotas e o formato abaixo constam da documentação de contrato/OpenAPI em branches da US02, ainda não integradas à `main` na elaboração deste registro. Este documento não altera esses arquivos.

### `POST /api/v1/auth/login`

Requisição JSON:

```json
{
  "email": "admin@example.com",
  "senha": "<senha-informada-pelo-administrador>"
}
```

Resposta de sucesso, HTTP 200:

```json
{
  "token": "<jwt>",
  "expiraEm": "<data-e-hora-ISO-8601-UTC>",
  "usuario": {
    "id": 1,
    "nome": "Administrador",
    "email": "admin@example.com"
  }
}
```

`expiraEm` deve representar a expiração real do JWT, **1 hora após a emissão**. A resposta não inclui `senha`, hash, `perfil` ou `ativo`.

| Situação                                                                             | HTTP | Formato esperado                                                               |
| ------------------------------------------------------------------------------------ | ---- | ------------------------------------------------------------------------------ |
| Corpo inválido, e-mail malformado ou senha vazia                                     | 400  | Envelope de erro padrão do NestJS.                                             |
| E-mail não encontrado, senha incorreta, conta inativa ou perfil diferente de `ADMIN` | 401  | Envelope de erro padrão, com a mesma mensagem genérica para todos esses casos. |

Exemplo de erro de autenticação:

```json
{
  "statusCode": 401,
  "message": "E-mail ou senha inválidos",
  "error": "Unauthorized"
}
```

### `GET /api/v1/auth/me`

Requisição: `Authorization: Bearer <token>`.

Resposta de sucesso, HTTP 200:

```json
{
  "id": 1,
  "nome": "Administrador",
  "email": "admin@example.com"
}
```

Token ausente, inválido ou expirado deve resultar em HTTP 401. Senha e hash nunca integram a resposta.

## 4. Administrador inicial

**Procedimento implementado na T15:** `npm run db:admin` lê `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_SENHA` do ambiente. A senha deve ter ao menos 12 caracteres. O processo aplica Argon2id antes de persistir, define `perfil = ADMIN` e `ativo = true`, não imprime a senha em logs e mantém uma conta existente inalterada. Para atualizar senha, nome e estado da conta existente, é necessário definir `ADMIN_ATUALIZAR_EXISTENTE=true` somente na execução desejada.

Não incluir credenciais reais, hashes predefinidos nem exemplos funcionais de senha em arquivos versionados. As variáveis usadas para a execução não devem ser gravadas em `.env` versionado nem expostas na saída do comando.

A equipe precisa definir quem executará o procedimento em cada ambiente e como a senha inicial será entregue ao responsável. As variáveis e o procedimento de troca estão descritos no README.

**Validação no login e criação da senha são regras diferentes.** No login, a #192 exige que a senha seja informada; em seguida, compara-a com o hash da conta. A criação da senha inicial exige ao menos 12 caracteres; não há outra regra de complexidade definida. A frase “senha deve ter pelo menos 6 caracteres” aparece apenas em um exemplo de erro do OpenAPI de outra branch; ela não corresponde à regra adotada.

## 5. Identidade, proteção de rotas e auditoria

O JWT deve identificar o usuário autenticado por um identificador estável, para que o guard recupere e valide a conta conforme a política da US03. O identificador do administrador autenticado poderá ser usado pelos módulos que registram ações em tabelas de auditoria. Os detalhes do payload, da consulta após validação do token e da integração com essas tabelas serão definidos nas tasks T13 a T15.

As rotas administrativas de eventos, dias e grupos deverão exigir autenticação conforme a T14. O login é público apenas no sentido de não exigir token prévio; ele não cria contas. A lista final de rotas protegidas deve ser conferida com os responsáveis por cada módulo e com o contrato da API.

## 6. Pendências para fechar a #191

| Ponto                                 | Estado / encaminhamento                                                                                                                                                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tempo de expiração do JWT             | **Definido para a US03: 1 hora.** Encaminhar ao responsável pelo contrato/OpenAPI e ao Front-end.                                                                                                                                                 |
| Seed do administrador                 | **Método definido: comando/seed controlado com senha fornecida por variável de ambiente local.** Falta definir o responsável pela execução e a entrega segura da senha em cada ambiente.                                                          |
| Regra para criar a senha inicial      | **Definida na T15:** mínimo de 12 caracteres no comando/seed. Isso não altera a verificação da senha no login. O exemplo de erro do OpenAPI que menciona mínimo de seis caracteres deve ser alinhado com a regra adotada. |
| Perfil descrito no OpenAPI            | **Divergente.** A descrição atual diz “organizador ou administrador”; a decisão da US03 admite apenas `ADMIN`. Solicitar correção ao responsável pelo contrato.                                                                                   |
| Respostas e uso do token no Front-end | **A validar.** Confirmar campos do login, tratamento de 400/401, expiração e uso de `/auth/me` com o Front-end.                                                                                                                                   |
| Contrato e OpenAPI                    | **Dependência de outra task.** Encaminhar as decisões aprovadas ao integrante responsável; este documento não altera o contrato.                                                                                                                  |

## 7. Referências e relação com as tasks

- US03 / Taiga #190: autenticação básica de administrador.
- T11 / Taiga #191: este registro do fluxo e das decisões pendentes.
- T12 / Taiga #192: módulo Auth, validação de credenciais e hash Argon2id, em branch própria.
- T13 / Taiga #193: emissão de JWT e guard.
- T14 / Taiga #194: proteção das rotas administrativas e documentação de segurança.
- T15 / Taiga #195: persistência de usuários, administrador inicial e testes de integração.
- Contrato da US02: `docs/contrato-api-t06.md` e `docs/openapi/openapi-v0.1.yaml` em branches de outro integrante.

Este documento é uma proposta de alinhamento. As pendências acima precisam de decisão explícita antes de declarar a definição do fluxo concluída.
