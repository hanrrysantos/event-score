-- EventScore - migration V12
-- CRITERIO_DESEMPATE alinhado ao contrato da API (RF13) e ao regimento (Art. 16)
-- Backend (Hanrry), para revisao da equipe de banco. Depende de V10.
-- PostgreSQL 13+.
--
-- O que muda:
-- 1. tipo passa a aceitar so os 4 tipos do contrato:
--      MAIOR_PONTUACAO_DESAFIO  maior pontuacao num desafio escolhido (exige desafio)
--      MAIOR_SOMA_DESAFIOS      maior soma dos pontos de todos os desafios,
--                               sem bonificacao nem penalidade
--      MAIOR_BONIFICACAO        maior soma de bonificacao
--      MENOR_PENALIDADE         menor soma de penalidade
--    Os criterios do Art. 16 do regimento sao: I a IV = MAIOR_PONTUACAO_DESAFIO
--    (um por desafio, na ordem do regimento), V = MAIOR_BONIFICACAO e
--    VI (sorteio publico) = decisao manual em DESEMPATE_MANUAL (RF14).
--    Presenca nao e criterio: pelos requisitos, presenca nao altera a
--    colocacao do grupo.
-- 2. id_desafio e obrigatorio em MAIOR_PONTUACAO_DESAFIO e proibido nos demais.
-- 3. A coluna sentido sai: a direcao ja esta no nome do tipo (MAIOR_/MENOR_).

-- Remove as travas antigas antes de converter os dados.
ALTER TABLE criterio_desempate
     DROP CONSTRAINT criterio_desempate_tipo_check,
     DROP CONSTRAINT ck_criterio_desafio_pontos;

-- Converte os criterios que ja existirem e tiverem equivalente no contrato.
-- O equivalente considera tipo, sentido e desafio, porque a V10 permitia
-- desafio em BONIFICACOES e PENALIDADES, e os tipos novos nao aceitam.
-- Qualquer outro caso interrompe a migracao com mensagem controlada, para nao
-- perder regra em silencio nem falhar depois ao criar ck_criterio_desafio.
-- Se falhar (P3018): corrija os dados, rode
--   npx prisma migrate resolve --rolled-back 20261108000012_v12_criterios_desempate_contrato
-- e aplique de novo com npm run db:deploy.
DO $$
DECLARE
  v_sem_equivalente INT;
BEGIN
  SELECT COUNT(*) INTO v_sem_equivalente
    FROM criterio_desempate
   WHERE NOT ((tipo = 'PONTOS_DESAFIO' AND sentido = 'DESC' AND id_desafio IS NOT NULL)
           OR (tipo = 'BONIFICACOES'   AND sentido = 'DESC' AND id_desafio IS NULL)
           OR (tipo = 'PENALIDADES'    AND sentido = 'ASC'  AND id_desafio IS NULL));

  IF v_sem_equivalente > 0 THEN
    RAISE EXCEPTION
      '% criterio(s) de desempate sem equivalente nos tipos do contrato; ajuste ou remova antes de aplicar a V12',
      v_sem_equivalente;
  END IF;
END;
$$;

UPDATE criterio_desempate
   SET tipo = CASE tipo
                WHEN 'PONTOS_DESAFIO' THEN 'MAIOR_PONTUACAO_DESAFIO'
                WHEN 'BONIFICACOES'   THEN 'MAIOR_BONIFICACAO'
                WHEN 'PENALIDADES'    THEN 'MENOR_PENALIDADE'
              END;

ALTER TABLE criterio_desempate
     DROP COLUMN sentido,
     ADD CONSTRAINT ck_criterio_tipo
       CHECK (tipo IN (
             'MAIOR_PONTUACAO_DESAFIO', 'MAIOR_SOMA_DESAFIOS',
             'MAIOR_BONIFICACAO', 'MENOR_PENALIDADE'
       )),
     ADD CONSTRAINT ck_criterio_desafio
       CHECK ((tipo = 'MAIOR_PONTUACAO_DESAFIO') = (id_desafio IS NOT NULL));
