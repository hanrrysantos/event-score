-- EventScore - migration V11
-- DESEMPATE_MANUAL append-only (vigente, id_decisao_anterior) e consulta de apoio
-- Secao 4 (Vitoria) da documentacao. Origem: Script C; depende de V7 e V10
-- PostgreSQL 13+.

CREATE TABLE desempate_manual (
     id_desempate INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_evento INT NOT NULL,
     id_grupo INT NOT NULL,
     id_apuracao INT NOT NULL,
     id_decisao_anterior INT,
     id_operacao UUID NOT NULL,
     posicao INT NOT NULL CHECK (posicao > 0),
     justificativa VARCHAR(500) NOT NULL
       CHECK (btrim(justificativa) <> ''),
     id_usuario INT NOT NULL
       REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
     data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
     vigente BOOLEAN NOT NULL DEFAULT TRUE,
     CONSTRAINT fk_desempate_evento
       FOREIGN KEY (id_evento)
       REFERENCES evento (id_evento) ON DELETE RESTRICT,
     CONSTRAINT fk_desempate_grupo_evento
       FOREIGN KEY (id_grupo, id_evento)
       REFERENCES grupo (id_grupo, id_evento) ON DELETE RESTRICT,
     CONSTRAINT fk_desempate_apuracao_evento
       FOREIGN KEY (id_apuracao, id_evento)
       REFERENCES apuracao (id_apuracao, id_evento) ON DELETE RESTRICT,
     CONSTRAINT fk_desempate_anterior
       FOREIGN KEY (id_decisao_anterior)
       REFERENCES desempate_manual (id_desempate) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_desempate_grupo_vigente
     ON desempate_manual (id_evento, id_grupo)
     WHERE vigente;

CREATE UNIQUE INDEX uq_desempate_posicao_vigente
  ON desempate_manual (id_evento, id_apuracao, posicao)
  WHERE vigente;

CREATE OR REPLACE FUNCTION fn_desempate_manual_historico()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Decisoes de desempate nao podem ser excluidas'
        USING ERRCODE = 'restrict_violation';
  END IF;
  IF TG_OP = 'UPDATE' THEN
    IF OLD.vigente = FALSE THEN
        RAISE EXCEPTION 'Decisao ja substituida nao pode ser alterada'
          USING ERRCODE = 'restrict_violation';
    END IF;
    IF NEW.id_evento IS DISTINCT FROM OLD.id_evento
     OR NEW.id_grupo IS DISTINCT FROM OLD.id_grupo
     OR NEW.id_apuracao IS DISTINCT FROM OLD.id_apuracao
     OR NEW.id_decisao_anterior IS DISTINCT FROM OLD.id_decisao_anterior
     OR NEW.id_operacao IS DISTINCT FROM OLD.id_operacao
     OR NEW.posicao IS DISTINCT FROM OLD.posicao
     OR NEW.justificativa IS DISTINCT FROM OLD.justificativa
     OR NEW.id_usuario IS DISTINCT FROM OLD.id_usuario
     OR NEW.data_hora IS DISTINCT FROM OLD.data_hora THEN
        RAISE EXCEPTION 'Somente o campo vigente pode ser alterado'
          USING ERRCODE = 'restrict_violation';
    END IF;
    IF NEW.vigente = TRUE AND OLD.vigente = FALSE THEN
         RAISE EXCEPTION 'Decisao substituida nao pode voltar a ser vigente'
           USING ERRCODE = 'restrict_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_desempate_manual_historico
  BEFORE UPDATE OR DELETE ON desempate_manual
  FOR EACH ROW EXECUTE FUNCTION fn_desempate_manual_historico();

-- Consulta de apoio: decisoes vigentes e apuracao correspondente.
-- (consulta de apoio, executar manualmente quando precisar)
-- SELECT d.id_evento, d.id_apuracao, d.id_grupo, d.posicao,
--    d.justificativa, u.nome AS responsavel, d.data_hora
--  FROM desempate_manual d
--  JOIN usuario u ON u.id_usuario = d.id_usuario
-- WHERE d.vigente
-- ORDER BY d.id_evento, d.id_apuracao, d.posicao;
