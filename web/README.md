# EventScore: front-end

Telas do EventScore (Arena Comp 2026) em React + Vite + TypeScript. Consome a API em `/api/v1`, conforme o contrato front x API v0.3 e o OpenAPI em [`docs/openapi/`](../docs/openapi/).

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
├── api/          # cliente HTTP (token, erros do NestJS, download) e tipos gerados do OpenAPI
├── components/   # layout com a navegação e paginação
├── pages/        # uma pasta por tela; regras puras em *.ts com teste ao lado (*.test.ts)
├── numero.ts     # números no padrão brasileiro ("0,8") <-> número JSON (0.8)
└── texto.ts      # iniciais do nome
```

Cada tela usa o **evento ativo** (`GET /eventos/ativo`), que o layout carrega uma vez e entrega às telas. Sem evento ativo, a tela mostra um aviso com link para a aba Evento. A exceção é a configuração, que recebe o evento pela rota e serve para qualquer edição.

## Telas

| Tela | Rota | Requisitos | Rotas da API |
|---|---|---|---|
| Login | `/login` | RNF02 | `POST /auth/login` |
| Eventos | `/evento` | RF01 | `GET /eventos`, `POST /eventos`, `PATCH /eventos/{id}`, `POST /eventos/{id}/ativar`, `GET/POST/DELETE /eventos/{id}/dias` |
| Configuração do evento | `/evento/{id}/configuracao` | RF02, RF13 | `GET/PUT /eventos/{id}/configuracao` |
| Grupos | `/grupos` | RF03 | `GET/POST/PATCH/DELETE /eventos/{id}/grupos`, `GET /eventos/{id}` (`temResultado`) |
| Participantes | `/participantes` | RF04 | `POST .../participantes/importacao/previa`, `POST .../participantes/importacao`, `GET .../participantes` |
| Desafios | `/desafios` | RF05, RF06 | `GET/POST/PATCH/DELETE /eventos/{id}/desafios` |
| Frequência | `/frequencia` | RF07, RNF04 | `GET .../dias/{diaId}/presencas`, `PUT .../dias/{diaId}/presencas/{participanteId}` |
| Lançamentos | `/lancamentos?aba=colocacao\|bonus\|classificacao` | RF08 a RF14, RF18 | `GET/PUT .../desafios/{id}/resultados`, `GET /auditoria`, `GET .../bonificacoes`, `PUT .../bonificacoes/{grupoId}`, `GET/POST/PATCH/DELETE .../penalidades`, `GET .../classificacao`, `POST .../desempates` |
| Apuração individual | `/apuracao` | RF16 | `GET /eventos/{id}/apuracao` |
| Relatórios | `/relatorios` | RF15, RF17, RNF03 | `GET .../relatorios/parcial`, `GET .../relatorios/final`, `GET .../relatorios/final/previa` |

## O que mudou em relação ao mock

As telas seguem os PNGs do mock, com a regra combinada no contrato v0.3: o que o mock mostra e não está nos requisitos nem no DER sai da tela.

| Tela | Mudança | Motivo |
|---|---|---|
| Login | Campo só de e-mail; saíram "matrícula" e "Esqueceu a senha?" | Login por e-mail e senha, sem recuperação nesta versão |
| Eventos | Lista de eventos com interruptor de ativo e botão "Configurar" na aba Evento | O mock não tinha lista, e o RF01 pede lista e escolha do evento ativo |
| Eventos | Dias operacionais sem nome de etapa ("Abertura / Etapa 1") | `DIA_EVENTO` só guarda número e data |
| Configuração | "Pontos por colocação" virou "Conversão em ponto extra" | Os valores 1,0 / 0,8... são a conversão; pontos por colocação são de cada desafio |
| Configuração | Saiu "Restaurar padrões"; entrou o bloco de critérios de desempate | RNF06 (nada fixado em código); RF02 e RF13 |
| Configuração | Critério `MAIOR_PRESENCA` saiu; ficam 4 tipos | Presença não altera a colocação do grupo, e o regimento (Art. 16) não usa presença |
| Grupos | Opção "outra cor" além das 6 do mock | A cor é única no evento e a quantidade de grupos é livre |
| Participantes | Coluna Turma e lista paginada de participantes cadastrados | Campos e rota do contrato |
| Desafios | Saíram "Critério de avaliação", "Peso" e o status "Validado"; a data virou a escolha de um dos dias do evento | A comissão apura fora do sistema e só a colocação entra; RF05 liga o desafio a um dia |
| Frequência | Saíram "Salvar folha" e a coluna de horário; cada marcação grava na hora | O DER não guarda horário; RF07 proíbe marcação em lote |
| Lançamentos | Saíram "Homologar", "Reverter" e o hash; colocação, bônus e classificação viraram três abas | Fora dos requisitos e do DER |
| Apuração | "Pontos da equipe" virou "Ponto extra do grupo"; "Executar apuração final" virou link para relatórios | O cálculo usa a conversão (RF16) e não grava nada |
| Relatórios | Saíram "Exportações anteriores" e a ata assinada | Fora dos requisitos e do DER |

## Decisões de implementação

- **Front em `web/` no mesmo repositório.** O contrato e o OpenAPI ficam no mesmo lugar, e o mock lê o OpenAPI oficial direto de `docs/openapi/`. O `tsconfig.json` da raiz exclui `web/`, para o typecheck do back-end não compilar o front.
- **Tipos gerados do OpenAPI** (`npm run api:tipos`). As rotas que ainda não estão no OpenAPI oficial têm tipos escritos à mão em cada tela, seguindo o contrato.
- **Regras puras separadas das telas.** Validações e cálculos ficam em arquivos `.ts` com teste ao lado (por exemplo, `pages/eventos/dias.ts` e `pages/lancamentos/regras.ts`). A tela só chama essas funções e a API.
- **Edição dos dias do evento.** Os gatilhos do banco não deixam mudar o período com dias fora dele nem repetir data no evento. Por isso, ao editar, o front exclui os dias que mudam de data, altera o evento e recria esses dias, nessa ordem. Se um dia já tiver desafio ou presença, a API recusa e a tela mostra a mensagem.
- **Frequência sem conexão estável (RNF04).** Marcação que não chega à API por falta de rede fica guardada no navegador (por evento e dia), aparece como "não salvo" e é reenviada quando a conexão volta ou pelo botão "Reenviar agora". O PUT é idempotente, então reenviar não duplica. Recusa da API desfaz a marcação. As pendências ficam só no navegador em que foram feitas.
- **Download de relatórios com token (RNF03).** Os arquivos são baixados com `fetch` e o cabeçalho `Authorization`, nunca por link aberto; o nome vem do `Content-Disposition`.
- **Erros.** A tela mostra o `message` do formato padrão do NestJS (uma linha por item quando é lista). Um 401 apaga o token e volta para o login. "Manter conectado" guarda o token no `localStorage`; sem ele, fica no `sessionStorage`.

## Para confirmar com o back-end

Pontos em que o front fez uma suposição ou em que o back-end está diferente do contrato:

- **`quantidadeDias`** é gravado e obrigatório no `POST /eventos`. O contrato dizia que seria contado a partir dos dias cadastrados. O front envia o campo.
- **`GET /eventos/ativo`** devolve o resumo, sem `temResultado`. A tela de grupos busca também `GET /eventos/{id}` para saber se a edição está travada (RF03).
- **Lista de participantes:** o front espera `turma`, `grupoId` e `grupo` em cada item, além de `id`, `matricula` e `nome`.
- **Confirmação da importação:** o front não lê o corpo da resposta, só o status.
- **Apuração:** `assiduidade` como fração de 0 a 1 (a tela mostra em %); `aptos` como alunos com ponto extra maior que zero; `colocacaoGrupo` pode vir `null`.
- **Critérios de desempate:** `MAIOR_PRESENCA` ainda está no enum do back-end (`src/common/enums/tipo-criterio-desempate.enum.ts`). Configuração antiga com esse tipo é retirada da lista na tela, com aviso, e some ao salvar.
- **Exclusões:** o contrato não define o que acontece ao excluir um desafio que já tem resultado lançado. A tela mostra a mensagem que a API devolver.
- **Filtro por turma:** previsto no contrato para participantes e apuração, ainda não existe na tela.
