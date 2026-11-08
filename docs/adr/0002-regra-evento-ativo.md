# ADR 0002 — Regra de evento ativo e isolamento entre eventos

## Status

Aceito em 08/11/2026.

## Contexto

O EventScore mantém várias edições de eventos no mesmo sistema. Os dados de
dias, grupos, participantes, desafios e apurações devem permanecer vinculados
à edição correta. Além disso, a API precisa identificar um evento ativo sem
ativar automaticamente uma edição recém-criada ou permitir dois eventos ativos
ao mesmo tempo.

O contrato OpenAPI prevê a criação de eventos inativos e uma operação explícita
`POST /eventos/{eventoId}/ativar`. A migração V1 reforça no PostgreSQL que pode
existir no máximo um registro com `ativo = true`.

## Opções consideradas

1. Ativar automaticamente o evento mais recente.
2. Derivar o evento ativo a partir da data atual.
3. Criar eventos inativos e ativá-los por uma operação explícita e atômica.

## Decisão

Adotamos a terceira opção:

- todo evento é criado com `ativo = false`;
- o `PATCH` cadastral não altera o estado ativo;
- a ativação é uma operação explícita e idempotente;
- ao ativar um evento, o evento anteriormente ativo é desativado na mesma
  transação;
- o sistema permite temporariamente não haver evento ativo, mas nunca mais de
  um;
- recursos subordinados são sempre consultados e alterados com o identificador
  do evento no escopo; um recurso de outro evento é tratado como não encontrado.

## Consequências

- A T18 deve expor a ativação somente pela rota dedicada do contrato.
- A T20 deve executar desativação e ativação em uma única transação e preservar
  o índice único parcial `ux_evento_ativo`.
- Os módulos de grupos e dias devem usar o contexto do evento e não consultar
  recursos apenas por seus identificadores globais.
- Testes de serviço cobrem criação inativa, preservação do estado no `PATCH`,
  período inclusivo e rejeição de recursos pertencentes a outro evento.
