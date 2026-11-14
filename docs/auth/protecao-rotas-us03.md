# US03 / Taiga #194 — Proteção das rotas administrativas

## Regra de acesso

`AuthModule.register(...)` registra `JwtAuthGuard` como guard global. Com o
módulo integrado à aplicação pela #195, toda rota de controller exige um JWT no
cabeçalho `Authorization: Bearer <token>`, salvo se estiver marcada com `@Public()`.
O guard verifica assinatura e expiração do token e consulta o usuário pelo ID do
payload. Só permite contas ativas com `perfil = ADMIN`. Token ausente, inválido,
expirado ou vinculado a conta sem permissão retorna HTTP 401.

| Rota ou grupo | Regra |
| --- | --- |
| `POST /api/v1/auth/login` | Pública; recebe e-mail e senha. |
| `GET /api/v1/auth/me` | Protegida; devolve os dados públicos do administrador autenticado. |
| `GET /health` | Pública; atende à verificação de infraestrutura. |
| Eventos | Protegidas por padrão. |
| Grupos e dias do evento | Protegidas por padrão quando os controllers forem implementados. |
| Demais rotas administrativas futuras | Protegidas por padrão. |

Não há cadastro público. Para abrir uma nova rota pública, o responsável deve
aplicar `@Public()` explicitamente e incluir um teste que comprove essa decisão.
Os módulos de eventos, grupos e dias não precisam aplicar outro guard: a regra
global passa a valer para todos quando `AuthModule.register(...)` for integrado.

## Swagger/OpenAPI

O Swagger da aplicação define o esquema HTTP Bearer com formato JWT. Controllers
administrativos devem usar `@ApiBearerAuth()` e documentar HTTP 401; o controller
de eventos já possui essas anotações. `POST /auth/login` não declara Bearer, pois
é a operação que emite o token. O Swagger não aplica uma exigência global de
segurança à documentação, para não marcar login e health como protegidos.

No Swagger UI, o administrador informa o token emitido pelo login no botão
**Authorize**. O token expira uma hora após a emissão, conforme a #193.

O arquivo `docs/openapi/openapi-v0.1.yaml` pertence à task de contrato da API e
já define Bearer como segurança padrão, com exceção explícita para login.
Alterações naquele contrato devem ser alinhadas com seu responsável.

## Integração da #195

`AppModule` registra `AuthModule.register(...)` uma única vez, com o repositório
Prisma de `usuario`. A API exige `JWT_SECRET` ao iniciar. Os testes HTTP de
integração usam um banco exclusivo, criam administradores temporários, validam
o login e exercitam a proteção global. Controllers futuros de eventos, grupos
e dias herdarão o guard; seus responsáveis devem conferir as anotações Swagger.
