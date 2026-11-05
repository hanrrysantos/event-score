-- EventScore - migration V10
-- CRITERIO_DESEMPATE, APURACAO, APURACAO_RESULTADO_DESAFIO, CLASSIFICACAO_GRUPO e APURACAO_CRITERIO
-- Secao 4 (Vitoria) da documentacao. Origem: Script B; depende de V1, V4, V7 e V9
-- PostgreSQL 13+.

CREATE TABLE criterio_desempate (
  id_criterio_desempate INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_evento INT NOT NULL
    REFERENCES evento (id_evento) ON DELETE RESTRICT,
  ordem INT NOT NULL CHECK (ordem > 0),
  descricao VARCHAR(255) NOT NULL,
  tipo VARCHAR(30) NOT NULL
    CHECK (tipo IN (
          'PONTOS_TOTAIS', 'VITORIAS', 'PODIOS',
          'SOMA_COLOCACOES', 'MEDIA_COLOCACOES', 'PONTOS_DESAFIO',
          'PRESENCA', 'BONIFICACOES', 'PENALIDADES',
          'CONFRONTO_DIRETO', 'SORTEIO'
    )),
  sentido VARCHAR(4) NOT NULL DEFAULT 'DESC'
    CHECK (sentido IN ('ASC', 'DESC')),
  id_desafio INT,
  CONSTRAINT uq_criterio_evento_ordem UNIQUE (id_evento, ordem),
     CONSTRAINT ck_criterio_desafio_pontos
       CHECK (tipo <> 'PONTOS_DESAFIO' OR id_desafio IS NOT NULL),
     CONSTRAINT fk_criterio_desafio_evento
       FOREIGN KEY (id_desafio, id_evento)
       REFERENCES desafio (id_desafio, id_evento)
       ON DELETE RESTRICT
);

CREATE TABLE apuracao (
     id_apuracao INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
     id_evento INT NOT NULL
       REFERENCES evento (id_evento) ON DELETE RESTRICT,
     versao INT NOT NULL CHECK (versao > 0),
     data_hora TIMESTAMPTZ NOT NULL DEFAULT now(),
     id_usuario INT NOT NULL
       REFERENCES usuario (id_usuario) ON DELETE RESTRICT,
     id_operacao UUID NOT NULL,
     status VARCHAR(15) NOT NULL DEFAULT 'PROVISORIA'
       CHECK (status IN ('PROVISORIA', 'OFICIAL', 'SUBSTITUIDA')),
     CONSTRAINT uq_apuracao_evento_versao UNIQUE (id_evento, versao),
     CONSTRAINT uq_apuracao_evento UNIQUE (id_apuracao, id_evento)
);

CREATE UNIQUE INDEX ux_apuracao_oficial
     ON apuracao (id_evento)
     WHERE status = 'OFICIAL';

CREATE TABLE apuracao_resultado_desafio (
     id_apuracao INT NOT NULL
       REFERENCES apuracao (id_apuracao) ON DELETE RESTRICT,
     id_resultado INT NOT NULL
       REFERENCES resultado_desafio (id_resultado) ON DELETE RESTRICT,
     id_desafio INT NOT NULL,
     id_grupo INT NOT NULL,
     colocacao INT,
     ausente BOOLEAN NOT NULL,
     pontos INT,
     PRIMARY KEY (id_apuracao, id_resultado),
     CONSTRAINT uq_apuracao_resultado_grupo
       UNIQUE (id_apuracao, id_desafio, id_grupo)
);

CREATE TABLE classificacao_grupo (
     id_apuracao INT NOT NULL,
     id_grupo INT NOT NULL,
     id_evento INT NOT NULL,
     posicao INT NOT NULL CHECK (posicao > 0),
     pontos_desafios INT NOT NULL DEFAULT 0,
     pontos_bonificacoes INT NOT NULL DEFAULT 0,
     pontos_penalidades INT NOT NULL DEFAULT 0,
     pontos_total INT NOT NULL,
     desempate_manual BOOLEAN NOT NULL DEFAULT FALSE,
     PRIMARY KEY (id_apuracao, id_grupo),
     CONSTRAINT uq_classificacao_posicao UNIQUE (id_apuracao, posicao),
     CONSTRAINT fk_classificacao_apuracao_evento
       FOREIGN KEY (id_apuracao, id_evento)
       REFERENCES apuracao (id_apuracao, id_evento)
       ON DELETE RESTRICT,
     CONSTRAINT fk_classificacao_grupo_evento
       FOREIGN KEY (id_grupo, id_evento)
       REFERENCES grupo (id_grupo, id_evento)
       ON DELETE RESTRICT
);

CREATE TABLE apuracao_criterio (
     id_apuracao INT NOT NULL,
     id_criterio_desempate INT NOT NULL
       REFERENCES criterio_desempate (id_criterio_desempate) ON DELETE RESTRICT,
     id_grupo INT NOT NULL,
     valor NUMERIC(12,4),
     ordem INT NOT NULL,
     resultado VARCHAR(30),
     PRIMARY KEY (id_apuracao, id_criterio_desempate, id_grupo),
     CONSTRAINT fk_apuracao_criterio_classificacao
       FOREIGN KEY (id_apuracao, id_grupo)
       REFERENCES classificacao_grupo (id_apuracao, id_grupo)
       ON DELETE RESTRICT
);
