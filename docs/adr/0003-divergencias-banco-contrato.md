# ADR 0003: Divergências entre o banco (V1 a V11) e o contrato da API

- **Status:** Proposto. Aguarda revisão da equipe de banco no PR da V12.
- **Data:** 2026-11-08
- **Tarefa:** revisão com a equipe de banco (plano de entregas do backend, seção 6)

## Contexto

As migrações V1 a V11 foram escritas pela equipe de banco a partir dos requisitos e do DER. O contrato da API foi fechado depois, entre back-end e front-end (v0.3, 29/10/2026), a partir das telas. Quando o código começou a usar o banco, apareceram pontos em que as duas frentes decidiram coisas diferentes.

Pela regra do ADR 0001 e do CONTRIBUTING, migrações aplicadas não são editadas: toda correção no banco vira uma migração nova, revisada pela equipe de banco.

Fontes usadas nas decisões: documento de requisitos, regimento da Arena Comp 2026 (Art. 16, 17 e 19), contrato com o front-end v0.3 e plano de entregas do backend.

## Resumo das decisões

| # | Ponto | Decisão | Migração |
|---|---|---|---|
| 1 | Tipos de critério de desempate | 4 tipos do contrato; desafio só em `MAIOR_PONTUACAO_DESAFIO`; sem coluna `sentido` | V12 |
| 2 | Perfil do usuário | Coluna mantida; o administrador é gravado como `ADMIN` | Não |
| 3 | `quantidade_dias` | Coluna mantida; o front envia `quantidadeDias` no `POST /eventos` | Não |
| 4 | Bloqueio de grupos após resultado (RF03) | Trigger da V6 mantido; a API traduz o erro para 409 | Não |
| 5 | Classificação gravada x calculada | Calculada na consulta; gravada como apuração só ao registrar desempate manual | Não |
| 6 | Excluir grupo com participantes | Recusar com 409 | Não |
| 7 | Faixa de penalidade | Validada no back-end (422) | Não |
| 8 | Formato da cor do grupo | Validado no DTO (400) | Não |

## Decisões

### 1. Tipos de critério de desempate (V12)

**Situação.** A V10 aceitava 11 tipos (`PONTOS_TOTAIS`, `VITORIAS`, `SORTEIO`...) e uma coluna `sentido` (ASC/DESC). O contrato usa outros nomes, e o banco recusava todos eles.

**Decisão.** A V12 aceita apenas:

| Tipo | Significado |
|---|---|
| `MAIOR_PONTUACAO_DESAFIO` | Maior pontuação num desafio escolhido (exige `id_desafio`) |
| `MAIOR_SOMA_DESAFIOS` | Maior soma dos pontos de todos os desafios, sem bonificação nem penalidade |
| `MAIOR_BONIFICACAO` | Maior soma de bonificação |
| `MENOR_PENALIDADE` | Menor soma de penalidade |

- `id_desafio` é obrigatório em `MAIOR_PONTUACAO_DESAFIO` e proibido nos demais.
- A coluna `sentido` sai, porque a direção já está no nome do tipo (MAIOR_/MENOR_), e manter as duas informações permitiria gravar dados contraditórios.
- O Art. 16 do regimento fica assim: os itens I a IV viram quatro `MAIOR_PONTUACAO_DESAFIO`, um por desafio e na ordem do regimento, e o item V vira `MAIOR_BONIFICACAO`, porque a bonificação é o quesito Identidade e Torcida. O item VI (sorteio público) não é tipo: persistindo o empate, a comissão sorteia e registra o resultado como desempate manual (RF14).
- **`MAIOR_PRESENCA` saiu do contrato.** Os requisitos dizem que presença não altera a colocação do grupo; usá-la como critério faria uma correção de presença mudar a classificação e o ponto extra de todo o grupo. O regimento também não usa presença.
- Tipos da V10 descartados: `CONFRONTO_DIRETO` (não há confronto entre dois grupos na gincana), `SORTEIO` (o sistema não sorteia, a comissão decide), `MEDIA_COLOCACOES` (favorece quem falta a um desafio), `SOMA_COLOCACOES` (equivale a `MAIOR_SOMA_DESAFIOS` e não define o grupo ausente), `PONTOS_TOTAIS` (é o próprio valor empatado), `VITORIAS` e `PODIOS` (não usados pelo regimento; podem voltar numa migração nova se uma edição futura pedir).

### 2. Perfil do usuário

**Situação.** `usuario.perfil` é obrigatório com padrão `OPERADOR`; o contrato não tem perfil, só o administrador.

**Decisão.** Manter a coluna. O script do administrador (`npm run db:admin`) e o seed gravam o perfil `ADMIN` explicitamente. A API não expõe perfil e não há 403.

### 3. `quantidade_dias`

**Situação.** O evento tem `quantidade_dias` obrigatório; o contrato do front (v0.3) previa contar os dias cadastrados.

**Decisão.** Manter a coluna, que atende o RF01 ("quantidade de dias de realização"). O OpenAPI já foi alinhado (PR #12): o front envia `quantidadeDias` no `POST /eventos`. O documento do front precisa ser atualizado.

### 4. Bloqueio de grupos após resultado (RF03)

**Situação.** O trigger da V6 já impede alterar grupos depois do primeiro resultado, mas usa `restrict_violation` (23001), que o Prisma devolve como P2003, o mesmo código de FK inexistente.

**Decisão.** Sem migração. O filtro de erros (T09) distingue pelo código original do Postgres e responde 409.

### 5. Classificação calculada e apuração gravada no desempate

**Situação.** O banco foi desenhado para gravar a classificação como uma versão (`apuracao`, `classificacao_grupo`, `apuracao_criterio`) e exige `desempate_manual.id_apuracao`. O contrato calcula a classificação na consulta, sem gravar. Sem apuração gravada, o desempate manual não podia ser salvo.

**Decisão.**

- `GET /eventos/{eventoId}/classificacao` calcula na hora, a partir dos lançamentos atuais (RF12, RF13, RF18).
- `POST /eventos/{eventoId}/desempates` grava, na mesma transação:
  1. uma `apuracao` nova, com status `PROVISORIA` e versão seguinte à última do evento;
  2. a `classificacao_grupo` daquele momento, já com a decisão aplicada;
  3. as decisões em `desempate_manual`, apontando para essa apuração. As decisões anteriores dos mesmos grupos deixam de ser vigentes (`vigente = false`, `id_decisao_anterior`).
- Uma decisão manual só é aplicada enquanto os grupos dela continuam empatados entre si, com os mesmos pontos e sem critério que os separe. Se uma correção desfizer o empate ou mudar os grupos envolvidos, a decisão é ignorada e o empate volta a aparecer em `empatesPendentes`.
- Como `classificacao_grupo` exige posições distintas, o `POST /desempates` resolve todos os empates pendentes de uma vez.
- O histórico das correções continua na `auditoria` (RF18); a apuração gravada registra o que a comissão viu ao decidir.

**Alternativas descartadas.** Tornar `id_apuracao` opcional (migração nova e perda do registro do que foi decidido) e gravar a classificação a cada apuração (muda o contrato e deixa a tela desatualizada entre uma correção e a próxima apuração).

### 6. Excluir grupo com participantes

**Situação.** A FK de `participante` para `grupo` não tem `ON DELETE`, então o banco recusa excluir um grupo com participantes. O contrato só previa 409 quando há resultado lançado.

**Decisão.** Sem migração. A API responde 409 com mensagem clara (por exemplo, "o grupo tem 12 participantes"). Excluir os participantes junto foi descartado: um clique apagaria alunos importados e suas presenças.

### 7. Faixa de penalidade

**Situação.** `penalidade_min` e `penalidade_max` ficam no evento (Art. 19, II: de 10 a 50 pontos), mas, diferente do teto da bonificação, nenhum trigger valida o valor lançado.

**Decisão.** Validar no back-end, com 422:

- pontos fora da faixa do evento;
- faixa ainda não configurada (`penalidade_min` e `penalidade_max` nulos);
- alteração da faixa na configuração que deixaria fora dela uma penalidade já lançada.

Um trigger equivalente ao da bonificação pode ser adicionado depois numa migração própria, sem mudar a API.

### 8. Formato da cor do grupo

**Situação.** O contrato usa `#RRGGBB`; o banco aceita qualquer texto de até 30 caracteres. A unicidade da cor por evento, sem diferenciar maiúsculas, continua garantida pelo banco.

**Decisão.** Validar no DTO de grupo, com 400 ("cor deve ser um hex válido"). Um CHECK no banco pode vir depois numa migração própria.

## Consequências

- **Equipe de banco:** revisa a V12. As demais decisões não alteram o banco.
- **Front-end:** o seletor de critério perde `MAIOR_PRESENCA`; `quantidadeDias` é enviado na criação do evento; a exclusão de grupo ganha um segundo motivo de 409 (grupo com participantes).
- **Back-end:**
  - Ikki: 409 do trigger de grupos na T09; 4 tipos e regra do `desafioId` no #199; faixa de penalidade na configuração; OpenAPI v0.2 sem `MAIOR_PRESENCA`.
  - Lucas: 409 ao excluir grupo com participantes e validação da cor no #201; faixa de penalidade no #206 parte 2.
  - Gustavo: 409 ao excluir desafio usado em critério de desempate (#202).
  - Hanrry: cálculo da classificação, validade das decisões manuais e gravação da apuração no #206 parte 3.
  - Saylon: a apuração individual (#204) parte da classificação calculada, não de uma apuração gravada.
