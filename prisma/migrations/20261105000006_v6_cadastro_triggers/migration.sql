-- EventScore - migration V6
-- Triggers do cadastro (datas do dia, revalidacao do evento, bloqueio de grupos apos resultado - RF03)
-- Secao 1 (Igor) da documentacao. Origem: Script 2; depende de DESAFIO e RESULTADO_DESAFIO (V4)
-- PostgreSQL 13+.

CREATE OR REPLACE FUNCTION fn_dia_evento_valida() RETURNS trigger AS $$
DECLARE
v_inicio DATE;
v_fim DATE;
v_qtd INT;
BEGIN
SELECT data_inicio, data_fim, quantidade_dias
INTO v_inicio, v_fim, v_qtd
FROM evento WHERE id_evento = NEW.id_evento;
IF NEW.data < v_inicio OR NEW.data > v_fim THEN
     RAISE EXCEPTION 'A data % esta fora do periodo do evento (% a %)',
       NEW.data, v_inicio, v_fim USING ERRCODE = 'check_violation';
END IF;
IF NEW.numero_dia > v_qtd THEN
     RAISE EXCEPTION 'numero_dia % excede a quantidade de dias do evento (%)',
       NEW.numero_dia, v_qtd USING ERRCODE = 'check_violation';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dia_evento_valida
BEFORE INSERT OR UPDATE ON dia_evento
FOR EACH ROW EXECUTE FUNCTION fn_dia_evento_valida();

-- 2) Evento: alterar periodo/quantidade nao pode invalidar dias ja cadastrados
CREATE OR REPLACE FUNCTION fn_evento_revalida_dias() RETURNS trigger AS $$
BEGIN
IF EXISTS (SELECT 1 FROM dia_evento d
WHERE d.id_evento = NEW.id_evento
AND (d.data < NEW.data_inicio
OR d.data > NEW.data_fim
OR d.numero_dia > NEW.quantidade_dias)) THEN
RAISE EXCEPTION
'A alteracao deixaria dias ja cadastrados fora do periodo ou da quantidade de dias do evento'
USING ERRCODE = 'check_violation';
END IF;
RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_evento_revalida_dias
BEFORE UPDATE OF data_inicio, data_fim, quantidade_dias ON evento
FOR EACH ROW EXECUTE FUNCTION fn_evento_revalida_dias();

-- 3) RF03: grupos so podem ser criados, editados ou excluidos enquanto
-- nao houver resultado lancado no evento
CREATE OR REPLACE FUNCTION fn_grupo_bloqueia_apos_resultado() RETURNS trigger AS $$
DECLARE
v_evento INT;
BEGIN
v_evento := COALESCE(NEW.id_evento, OLD.id_evento);
IF EXISTS (SELECT 1
       FROM resultado_desafio r
       JOIN desafio d   ON d.id_desafio = r.id_desafio
       JOIN dia_evento de ON de.id_dia = d.id_dia
      WHERE de.id_evento = v_evento) THEN
  RAISE EXCEPTION
    'Grupos nao podem ser alterados apos o lancamento de resultados no evento %', v_evento
    USING ERRCODE = 'restrict_violation';
END IF;
RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_grupo_bloqueia_apos_resultado
BEFORE INSERT OR UPDATE OR DELETE ON grupo
FOR EACH ROW EXECUTE FUNCTION fn_grupo_bloqueia_apos_resultado();
