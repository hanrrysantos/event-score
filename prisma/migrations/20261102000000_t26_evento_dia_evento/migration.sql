-- T26: representação Prisma das tabelas EVENTO e DIA_EVENTO da V1 oficial.
--
-- A equipe de banco deve validar este arquivo antes do merge. As migrations
-- Flyway V1..V11 do ZIP oficial não são alteradas nem substituídas por este
-- arquivo. IF NOT EXISTS permite usar o Prisma sobre uma base já criada pelo
-- Flyway; a compatibilidade final deve ser homologada pelo grupo de banco.

CREATE TABLE IF NOT EXISTS "evento" (
    "id_evento" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "nome" VARCHAR(150) NOT NULL,
    "ano" INTEGER NOT NULL,
    "data_inicio" DATE NOT NULL,
    "data_fim" DATE NOT NULL,
    "quantidade_dias" INTEGER NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "penalidade_min" INTEGER,
    "penalidade_max" INTEGER,
    CONSTRAINT "ck_evento_periodo" CHECK ("data_fim" >= "data_inicio"),
    CONSTRAINT "ck_evento_qtd_dias" CHECK ("quantidade_dias" > 0 AND "quantidade_dias" <= ("data_fim" - "data_inicio") + 1),
    CONSTRAINT "ck_evento_penalidade_par" CHECK (("penalidade_min" IS NULL) = ("penalidade_max" IS NULL)),
    CONSTRAINT "ck_evento_penalidade_faixa" CHECK ("penalidade_min" IS NULL OR ("penalidade_min" >= 0 AND "penalidade_min" <= "penalidade_max")),
    CONSTRAINT "uq_evento_nome_ano" UNIQUE ("nome", "ano")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ux_evento_ativo" ON "evento" ("ativo") WHERE "ativo";

CREATE TABLE IF NOT EXISTS "dia_evento" (
    "id_dia" INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    "id_evento" INTEGER NOT NULL,
    "numero_dia" INTEGER NOT NULL,
    "data" DATE NOT NULL,
    CONSTRAINT "fk_dia_evento_evento" FOREIGN KEY ("id_evento") REFERENCES "evento" ("id_evento"),
    CONSTRAINT "ck_dia_numero_positivo" CHECK ("numero_dia" > 0),
    CONSTRAINT "uq_dia_numero" UNIQUE ("id_evento", "numero_dia"),
    CONSTRAINT "uq_dia_data" UNIQUE ("id_evento", "data"),
    CONSTRAINT "uq_dia_evento" UNIQUE ("id_dia", "id_evento")
);
