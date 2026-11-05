-- EventScore - migration V3
-- Trigger de validacao do fator e view vw_participante_fator (sem a carga de dados)
-- Secao 2 (Hortencia) da documentacao. Origem: Script 2
-- PostgreSQL 13+.

CREATE OR REPLACE FUNCTION fn_fator_presenca_valida() RETURNS trigger AS $$
DECLARE
v_qtd INT;
BEGIN
SELECT quantidade_dias INTO v_qtd
FROM evento WHERE id_evento = NEW.id_evento;
IF NEW.dias_presentes > v_qtd THEN
  RAISE EXCEPTION 'dias_presentes % excede a quantidade de dias do evento (%)',
      NEW.dias_presentes, v_qtd USING ERRCODE = 'check_violation';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_fator_presenca_valida
BEFORE INSERT OR UPDATE ON fator_presenca
FOR EACH ROW EXECUTE FUNCTION fn_fator_presenca_valida();

-- View: dias presentes e fator de cada participante
-- Quem nao tem presenca lancada conta 0 dias (fator 0)
CREATE VIEW vw_participante_fator AS
WITH contagem AS (
SELECT p.id_participante,
      p.id_evento,
      p.id_grupo,
      COUNT(pr.id_presenca) FILTER (WHERE pr.presente) AS dias_presentes
FROM participante p
LEFT JOIN presenca pr ON pr.id_participante = p.id_participante
GROUP BY p.id_participante, p.id_evento, p.id_grupo
)
SELECT c.id_participante,
    c.id_evento,
    c.id_grupo,
    c.dias_presentes,
 f.fator
FROM contagem c
LEFT JOIN fator_presenca f
 ON f.id_evento = c.id_evento
 AND f.dias_presentes = c.dias_presentes;

-- Ponto extra individual (usado na apuracao, fora desta secao):
-- ROUND(ponto_extra_do_grupo * fator, 2)
