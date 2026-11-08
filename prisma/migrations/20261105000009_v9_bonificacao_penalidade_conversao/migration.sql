-- EventScore - migration V9
-- ITEM_BONIFICACAO, BONIFICACAO_GRUPO, PENALIDADE e CONVERSAO_PONTO_EXTRA, com triggers de teto
-- Secao 4 (Vitoria) da documentacao. Origem: Script A; depende de V1 e V7 (USUARIO)
-- PostgreSQL 13+.

CREATE TABLE item_bonificacao (
     id_item_bonificacao INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_evento INT NOT NULL
       REFERENCES evento (id_evento) ON DELETE RESTRICT,
     nome VARCHAR(150) NOT NULL,
     teto INT NOT NULL CHECK (teto >= 0),
     CONSTRAINT uq_item_bonificacao_evento_nome UNIQUE (id_evento, nome)
);

CREATE TABLE bonificacao_grupo (
     id_bonificacao_grupo INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_item_bonificacao INT NOT NULL
       REFERENCES item_bonificacao (id_item_bonificacao) ON DELETE RESTRICT,
     id_grupo INT NOT NULL
       REFERENCES grupo (id_grupo) ON DELETE RESTRICT,
     valor INT NOT NULL CHECK (valor >= 0),
     CONSTRAINT uq_bonificacao_grupo_item UNIQUE (id_grupo, id_item_bonificacao)
);

CREATE TABLE penalidade (
     id_penalidade INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     descricao VARCHAR(255),
     pontos INT NOT NULL CHECK (pontos > 0),
     justificativa VARCHAR(500) NOT NULL
       CHECK (btrim(justificativa) <> ''),
     id_grupo INT NOT NULL
       REFERENCES grupo (id_grupo) ON DELETE RESTRICT
);

CREATE TABLE conversao_ponto_extra (
     id_conversao_ponto_extra INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_evento INT NOT NULL
       REFERENCES evento (id_evento) ON DELETE RESTRICT,
     colocacao INT NOT NULL CHECK (colocacao > 0),
     ponto_extra NUMERIC(5,1) NOT NULL
       CHECK (ponto_extra >= 0 AND ponto_extra <= 1),
     CONSTRAINT uq_conversao_evento_colocacao UNIQUE (id_evento, colocacao)
);

CREATE OR REPLACE FUNCTION fn_s4_bonificacao_valida()
RETURNS trigger AS $$
DECLARE
 v_teto INT;
 v_evento_item INT;
 v_evento_grupo INT;
BEGIN
 SELECT teto, id_evento
  INTO v_teto, v_evento_item
  FROM item_bonificacao
  WHERE id_item_bonificacao = NEW.id_item_bonificacao
  FOR SHARE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Item inexistente'
        USING ERRCODE = 'foreign_key_violation';
 END IF;
 SELECT id_evento
  INTO v_evento_grupo
  FROM grupo
  WHERE id_grupo = NEW.id_grupo
  FOR SHARE;
 IF NOT FOUND THEN
   RAISE EXCEPTION 'Grupo inexistente'
        USING ERRCODE = 'foreign_key_violation';
 END IF;
 IF v_evento_item <> v_evento_grupo THEN
   RAISE EXCEPTION 'Grupo e item pertencem a eventos diferentes'
        USING ERRCODE = 'check_violation';
  END IF;
  IF NEW.valor > v_teto THEN
    RAISE EXCEPTION 'Valor excede o teto da bonificacao (%)', v_teto
        USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_s4_bonificacao_valida
  BEFORE INSERT OR UPDATE ON bonificacao_grupo
  FOR EACH ROW EXECUTE FUNCTION fn_s4_bonificacao_valida();

CREATE OR REPLACE FUNCTION fn_s4_item_revalida_teto()
RETURNS trigger AS $$
BEGIN
  IF EXISTS (
    SELECT 1
       FROM bonificacao_grupo
       WHERE id_item_bonificacao = OLD.id_item_bonificacao
        AND valor > NEW.teto
  ) THEN
    RAISE EXCEPTION 'Novo teto invalida bonificacoes existentes'
        USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_s4_item_revalida_teto
  BEFORE UPDATE OF teto ON item_bonificacao
  FOR EACH ROW EXECUTE FUNCTION fn_s4_item_revalida_teto();
