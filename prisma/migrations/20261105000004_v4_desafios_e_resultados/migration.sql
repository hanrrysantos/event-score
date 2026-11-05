-- EventScore - migration V4
-- Tabelas DESAFIO, PONTOS_COLOCACAO e RESULTADO_DESAFIO
-- Secao 3 (Mauricio) da documentacao. Origem: Script 1
-- PostgreSQL 13+.

CREATE TABLE desafio (
     id_desafio INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_evento INT NOT NULL REFERENCES evento (id_evento) ON DELETE RESTRICT,
     id_dia   INT NOT NULL,
     nome     VARCHAR(100) NOT NULL,
     descricao VARCHAR(255),
     CONSTRAINT uq_desafio_evento UNIQUE (id_desafio, id_evento),
     CONSTRAINT uq_desafio_nome UNIQUE (id_evento, id_dia, nome),
     CONSTRAINT fk_desafio_dia_evento
       FOREIGN KEY (id_dia, id_evento)
       REFERENCES dia_evento (id_dia, id_evento)
       ON DELETE RESTRICT
);

CREATE TABLE pontos_colocacao (
     id_pontos_colocacao INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_desafio        INT NOT NULL REFERENCES desafio (id_desafio) ON DELETE RESTRICT,
     colocacao         INT NOT NULL,
     pontos          INT NOT NULL,
     CONSTRAINT ck_pontos_colocacao_pos CHECK (colocacao > 0),
     CONSTRAINT ck_pontos_colocacao_val CHECK (pontos >= 0),
     CONSTRAINT uq_pontos_colocacao UNIQUE (id_desafio, colocacao)
);

CREATE TABLE resultado_desafio (
     id_resultado INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_evento INT NOT NULL,
     id_desafio INT NOT NULL,
     id_grupo      INT NOT NULL,
     colocacao INT,
     ausente      BOOLEAN NOT NULL DEFAULT FALSE,
     CONSTRAINT uq_resultado_grupo_desafio UNIQUE (id_desafio, id_grupo),
     CONSTRAINT ck_resultado_ausencia_colocacao CHECK (
          (ausente = TRUE AND colocacao IS NULL) OR
          (ausente = FALSE AND colocacao IS NOT NULL AND colocacao > 0)
     ),
     CONSTRAINT fk_resultado_desafio_evento
          FOREIGN KEY (id_desafio, id_evento)
          REFERENCES desafio (id_desafio, id_evento)
          ON DELETE RESTRICT,
     CONSTRAINT fk_resultado_grupo_evento
          FOREIGN KEY (id_grupo, id_evento)
          REFERENCES grupo (id_grupo, id_evento)
       ON DELETE RESTRICT
);

CREATE UNIQUE INDEX ux_resultado_colocacao_presentes
     ON resultado_desafio (id_desafio, colocacao)
     WHERE NOT ausente;

CREATE INDEX ix_resultado_desafio ON resultado_desafio (id_desafio);

CREATE INDEX ix_resultado_grupo ON resultado_desafio (id_grupo);
