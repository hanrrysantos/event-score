-- EventScore - migration V8
-- Triggers que impedem UPDATE, DELETE e TRUNCATE na auditoria
-- Secao 5 (Cybele) da documentacao. Origem: Script 2
-- PostgreSQL 13+.

CREATE OR REPLACE FUNCTION fn_auditoria_imutavel() RETURNS trigger AS $$
BEGIN
     RAISE EXCEPTION
       'Registros de auditoria nao podem ser alterados ou excluidos (% em %)',
       TG_OP, TG_TABLE_NAME
       USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auditoria_imutavel
     BEFORE UPDATE OR DELETE ON auditoria
     FOR EACH ROW EXECUTE FUNCTION fn_auditoria_imutavel();

CREATE TRIGGER trg_auditoria_sem_truncate
     BEFORE TRUNCATE ON auditoria
     FOR EACH STATEMENT EXECUTE FUNCTION fn_auditoria_imutavel();

CREATE TRIGGER trg_auditoria_detalhe_imutavel
     BEFORE UPDATE OR DELETE ON auditoria_detalhe
     FOR EACH ROW EXECUTE FUNCTION fn_auditoria_imutavel();

CREATE TRIGGER trg_auditoria_detalhe_sem_truncate
     BEFORE TRUNCATE ON auditoria_detalhe
     FOR EACH STATEMENT EXECUTE FUNCTION fn_auditoria_imutavel();

-- Reforco por permissao (ajustar o nome do papel da aplicacao):
-- REVOKE UPDATE, DELETE, TRUNCATE ON auditoria, auditoria_detalhe
--    FROM <papel_da_aplicacao>;
