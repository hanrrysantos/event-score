-- EventScore - migration V2
-- Tabelas PRESENCA e FATOR_PRESENCA
-- Secao 2 (Hortencia) da documentacao. Origem: Script 1
-- PostgreSQL 13+.

CREATE TABLE presenca (
id_presenca         INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
id_evento         INT NOT NULL,
id_dia         INT NOT NULL,
id_participante INT NOT NULL,
presente         BOOLEAN NOT NULL,
-- um registro por participante por dia
CONSTRAINT uq_presenca_dia_participante UNIQUE (id_dia, id_participante),
-- dia e participante precisam ser do mesmo evento da presenca
CONSTRAINT fk_presenca_dia_evento
     FOREIGN KEY (id_dia, id_evento)
     REFERENCES dia_evento (id_dia, id_evento),
CONSTRAINT fk_presenca_participante_evento
     FOREIGN KEY (id_participante, id_evento)
     REFERENCES participante (id_participante, id_evento)
);

CREATE INDEX ix_presenca_participante ON presenca (id_participante);

-- ---------------------------------------------------------------------
-- FATOR_PRESENCA (configuracao por evento)
-- ---------------------------------------------------------------------
CREATE TABLE fator_presenca (
id_fator_presenca INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
id_evento           INT NOT NULL REFERENCES evento (id_evento),
dias_presentes INT NOT NULL,
fator           NUMERIC(5,4) NOT NULL,
CONSTRAINT ck_fator_dias CHECK (dias_presentes >= 0),
CONSTRAINT ck_fator_faixa CHECK (fator >= 0 AND fator <= 1),
CONSTRAINT uq_fator_evento_dias UNIQUE (id_evento, dias_presentes)
);
