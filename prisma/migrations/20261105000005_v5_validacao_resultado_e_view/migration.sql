-- EventScore - migration V5
-- Funcao fn_validar_resultado_desafio e view vw_resultado_pontuado
-- Secao 3 (Mauricio) da documentacao. Origem: Script 2
-- PostgreSQL 13+.

CREATE OR REPLACE FUNCTION fn_validar_resultado_desafio(p_id_desafio INT)
RETURNS void AS $$
DECLARE
     v_id_evento     INT;
     v_total_grupos INT;
     v_total_resultados INT;
     v_total_presentes INT;
     v_total_pontos INT;
     v_lacunas     INT;
BEGIN
     SELECT d.id_evento INTO v_id_evento
      FROM desafio d
     WHERE d.id_desafio = p_id_desafio;
     IF NOT FOUND THEN
       RAISE EXCEPTION 'Desafio % inexistente', p_id_desafio
         USING ERRCODE = 'foreign_key_violation';
END IF;
SELECT COUNT(*) INTO v_total_grupos
 FROM grupo g
WHERE g.id_evento = v_id_evento;
SELECT COUNT(*) INTO v_total_resultados
 FROM resultado_desafio r
WHERE r.id_desafio = p_id_desafio;
IF v_total_resultados <> v_total_grupos THEN
  RAISE EXCEPTION
    'Desafio % tem % resultados para % grupos do evento',
    p_id_desafio, v_total_resultados, v_total_grupos
    USING ERRCODE = 'check_violation';
END IF;
SELECT COUNT(*) FILTER (WHERE NOT ausente)
 INTO v_total_presentes
 FROM resultado_desafio
WHERE id_desafio = p_id_desafio;
SELECT COUNT(*)
 INTO v_total_pontos
 FROM resultado_desafio r
 JOIN pontos_colocacao pc
  ON pc.id_desafio = r.id_desafio
 AND pc.colocacao = r.colocacao
WHERE r.id_desafio = p_id_desafio
     AND NOT r.ausente;
 IF v_total_pontos <> v_total_presentes THEN
     RAISE EXCEPTION
        'Desafio % tem % grupos presentes, mas apenas % com pontuação configurada',
        p_id_desafio, v_total_presentes, v_total_pontos
        USING ERRCODE = 'check_violation';
 END IF;
 WITH presentes AS (
     SELECT r.colocacao,
          ROW_NUMBER() OVER (ORDER BY r.colocacao) AS esperado
       FROM resultado_desafio r
       WHERE r.id_desafio = p_id_desafio
        AND NOT r.ausente
 )
 SELECT COUNT(*) INTO v_lacunas
     FROM presentes
  WHERE colocacao <> esperado;
 IF v_lacunas > 0 THEN
     RAISE EXCEPTION
        'As colocações do desafio % não formam a sequência 1..N',
        p_id_desafio
        USING ERRCODE = 'check_violation';
 END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE VIEW vw_resultado_pontuado AS
SELECT r.id_resultado,
    r.id_evento,
    r.id_desafio,
    r.id_grupo,
    r.colocacao,
    r.ausente,
    CASE WHEN r.ausente THEN 0 ELSE pc.pontos END AS pontos
 FROM resultado_desafio r
 LEFT JOIN pontos_colocacao pc
  ON pc.id_desafio = r.id_desafio
 AND pc.colocacao = r.colocacao;
