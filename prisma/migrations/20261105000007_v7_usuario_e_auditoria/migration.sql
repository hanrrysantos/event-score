-- EventScore - migration V7
-- Tabelas USUARIO, AUDITORIA e AUDITORIA_DETALHE
-- Secao 5 (Cybele) da documentacao. Origem: Script 1
-- PostgreSQL 13+.

CREATE TABLE usuario (
     id_usuario INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     nome VARCHAR(150) NOT NULL,
     email VARCHAR(150) NOT NULL,
     senha_hash VARCHAR(255) NOT NULL,
     perfil VARCHAR(20) NOT NULL DEFAULT 'OPERADOR'
       CHECK (perfil IN ('ADMIN', 'OPERADOR', 'CONSULTA', 'SISTEMA')),
     ativo BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE UNIQUE INDEX ux_usuario_email ON usuario (lower(email));

CREATE TABLE auditoria (
     id_auditoria INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_usuario INT NOT NULL
       REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
     id_evento INT
       REFERENCES evento (id_evento) ON DELETE RESTRICT,
     id_operacao UUID NOT NULL,
     entidade VARCHAR(60) NOT NULL,
     id_registro INT NOT NULL,
     operacao VARCHAR(10) NOT NULL
       CHECK (operacao IN ('INSERT', 'UPDATE', 'DELETE', 'RECALCULO')),
     data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
     descricao VARCHAR(255),
     justificativa VARCHAR(500),
     afeta_resultado BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX ix_auditoria_evento_data ON auditoria (id_evento, data_hora);

CREATE INDEX ix_auditoria_operacao ON auditoria (id_operacao);

CREATE INDEX ix_auditoria_registro ON auditoria (entidade, id_registro);

CREATE INDEX ix_auditoria_usuario ON auditoria (id_usuario);

CREATE INDEX ix_auditoria_recalculo ON auditoria (id_evento, data_hora)
     WHERE afeta_resultado;

CREATE TABLE auditoria_detalhe (
     id_auditoria_detalhe INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_auditoria INT NOT NULL
       REFERENCES auditoria (id_auditoria) ON DELETE RESTRICT,
     campo VARCHAR(60) NOT NULL,
     valor_anterior TEXT,
     valor_novo TEXT,
     CONSTRAINT uq_auditoria_detalhe_campo UNIQUE (id_auditoria, campo),
     CONSTRAINT ck_auditoria_detalhe_mudanca
       CHECK (valor_anterior IS DISTINCT FROM valor_novo)
);
