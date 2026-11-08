-- EventScore - migration V1
-- Tabelas de cadastro: EVENTO, DIA_EVENTO, GRUPO, PARTICIPANTE
-- Secao 1 (Igor) da documentacao. Origem: Script 1
-- PostgreSQL 13+.

CREATE TABLE evento (
id_evento          INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
nome          VARCHAR(150) NOT NULL,
ano         INT      NOT NULL,
data_inicio DATE         NOT NULL,
data_fim       DATE     NOT NULL,
quantidade_dias INT        NOT NULL,
ativo       BOOLEAN NOT NULL DEFAULT FALSE,
-- limites de penalidade: nulos ate a configuracao de pontuacao (RF02)
penalidade_min INT,
penalidade_max INT,
CONSTRAINT ck_evento_periodo
     CHECK (data_fim >= data_inicio),
CONSTRAINT ck_evento_qtd_dias
     CHECK (quantidade_dias > 0
        AND quantidade_dias <= (data_fim - data_inicio) + 1),
CONSTRAINT ck_evento_penalidade_par
     CHECK ((penalidade_min IS NULL) = (penalidade_max IS NULL)),
CONSTRAINT ck_evento_penalidade_faixa
     CHECK (penalidade_min IS NULL
        OR (penalidade_min >= 0 AND penalidade_min <= penalidade_max)),
-- sugestao adicional: evita cadastrar o mesmo evento duas vezes
CONSTRAINT uq_evento_nome_ano UNIQUE (nome, ano)
);

-- Somente um evento ativo por vez (RF01)
CREATE UNIQUE INDEX ux_evento_ativo ON evento (ativo) WHERE ativo;

-- ---------------------------------------------------------------------
-- DIA_EVENTO
-- ---------------------------------------------------------------------
CREATE TABLE dia_evento (
id_dia INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
id_evento INT NOT NULL REFERENCES evento (id_evento),
numero_dia INT NOT NULL,
data        DATE NOT NULL,
CONSTRAINT ck_dia_numero_positivo CHECK (numero_dia > 0),
CONSTRAINT uq_dia_numero                 UNIQUE (id_evento, numero_dia),
CONSTRAINT uq_dia_data               UNIQUE (id_evento, data),
-- chave auxiliar: permite FK composta em PRESENCA e DESAFIO (outras secoes)
CONSTRAINT uq_dia_evento               UNIQUE (id_dia, id_evento)
);

-- ---------------------------------------------------------------------
-- GRUPO
-- ---------------------------------------------------------------------
CREATE TABLE grupo (
id_grupo INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
id_evento INT             NOT NULL REFERENCES evento (id_evento),
nome         VARCHAR(60) NOT NULL,
cor       VARCHAR(30) NOT NULL,
-- chave auxiliar: base da FK composta de PARTICIPANTE
CONSTRAINT uq_grupo_evento UNIQUE (id_grupo, id_evento)
);

-- nome e cor unicos por evento, sem diferenciar maiusculas de minusculas
CREATE UNIQUE INDEX ux_grupo_nome ON grupo (id_evento, lower(nome));

CREATE UNIQUE INDEX ux_grupo_cor ON grupo (id_evento, lower(cor));

-- ---------------------------------------------------------------------
-- PARTICIPANTE
-- ---------------------------------------------------------------------
CREATE TABLE participante (
id_participante INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
id_grupo          INT         NOT NULL,
id_evento          INT         NOT NULL REFERENCES evento (id_evento),
nome             VARCHAR(150) NOT NULL,
matricula         VARCHAR(20) NOT NULL,
turma            VARCHAR(10) NOT NULL,
-- matricula unica por evento, mesmo entre grupos diferentes (Task 2)
CONSTRAINT uq_participante_matricula UNIQUE (id_evento, matricula),
-- o grupo precisa pertencer ao mesmo evento do participante (Task 1)
CONSTRAINT fk_participante_grupo_evento
     FOREIGN KEY (id_grupo, id_evento)
     REFERENCES grupo (id_grupo, id_evento),
-- chave auxiliar: permite FK composta em PRESENCA (outra secao)
CONSTRAINT uq_participante_evento UNIQUE (id_participante, id_evento)
);

CREATE INDEX ix_participante_grupo ON participante (id_grupo);
