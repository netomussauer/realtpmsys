-- =============================================================================
-- realtpmsys — Schema PostgreSQL 16
-- Versão: 1.0.0  |  Data: 2026-04-14
-- Referência: docs/SDD.md §2
-- =============================================================================

-- Extensão para UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE perfil_usuario     AS ENUM ('ADMIN', 'TREINADOR', 'RESPONSAVEL');
CREATE TYPE status_atleta      AS ENUM ('ATIVO', 'INATIVO', 'SUSPENSO');
CREATE TYPE parentesco         AS ENUM ('PAI', 'MAE', 'AVO', 'OUTRO');
CREATE TYPE status_treinador   AS ENUM ('ATIVO', 'INATIVO');
CREATE TYPE status_turma       AS ENUM ('ATIVA', 'ENCERRADA', 'SUSPENSA');
CREATE TYPE dia_semana         AS ENUM ('SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM');
CREATE TYPE status_matricula   AS ENUM ('ATIVA', 'CANCELADA', 'TRANSFERIDA');
CREATE TYPE status_contrato    AS ENUM ('ATIVO', 'CANCELADO', 'ENCERRADO');
CREATE TYPE status_mensalidade AS ENUM ('PENDENTE', 'PAGO', 'VENCIDO', 'CANCELADO', 'ISENTO');
CREATE TYPE presenca           AS ENUM ('PRESENTE', 'AUSENTE', 'JUSTIFICADO');

-- =============================================================================
-- CONTEXTO: IDENTIDADE
-- =============================================================================

CREATE TABLE usuarios (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(254) NOT NULL,
    senha_hash    VARCHAR(255) NOT NULL,
    perfil        perfil_usuario NOT NULL DEFAULT 'RESPONSAVEL',
    ativo         BOOLEAN     NOT NULL DEFAULT TRUE,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em   TIMESTAMPTZ,

    CONSTRAINT uq_usuarios_email UNIQUE (email)
);

CREATE INDEX idx_usuarios_email    ON usuarios (email)    WHERE deletado_em IS NULL;
CREATE INDEX idx_usuarios_perfil   ON usuarios (perfil)   WHERE deletado_em IS NULL;

-- =============================================================================
-- CONTEXTO: ATLETAS
-- =============================================================================

CREATE TABLE atletas (
    id                     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    nome                   VARCHAR(150) NOT NULL,
    data_nascimento        DATE         NOT NULL,
    cpf                    CHAR(11),
    rg                     VARCHAR(20),
    endereco               VARCHAR(200),
    cidade                 VARCHAR(100),
    uf                     CHAR(2),
    cep                    CHAR(8),
    email                  VARCHAR(254),
    telefone               VARCHAR(15),
    status                 status_atleta NOT NULL DEFAULT 'ATIVO',
    usuario_responsavel_id UUID         REFERENCES usuarios (id) ON DELETE SET NULL,
    criado_em              TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deletado_em            TIMESTAMPTZ,

    CONSTRAINT uq_atletas_cpf UNIQUE (cpf),
    CONSTRAINT chk_atleta_uf CHECK (uf ~ '^[A-Z]{2}$')
);

CREATE INDEX idx_atletas_nome         ON atletas (nome)              WHERE deletado_em IS NULL;
CREATE INDEX idx_atletas_status       ON atletas (status)            WHERE deletado_em IS NULL;
CREATE INDEX idx_atletas_responsavel  ON atletas (usuario_responsavel_id);
CREATE INDEX idx_atletas_nascimento   ON atletas (data_nascimento)   WHERE deletado_em IS NULL;

-- -----------------------------------------------------------------------------

CREATE TABLE responsaveis (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id        UUID        NOT NULL REFERENCES atletas (id) ON DELETE RESTRICT,
    nome             VARCHAR(150) NOT NULL,
    cpf              CHAR(11),
    email            VARCHAR(254),
    telefone         VARCHAR(15)  NOT NULL,
    parentesco       parentesco   NOT NULL,
    contato_principal BOOLEAN     NOT NULL DEFAULT FALSE,
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_responsaveis_cpf UNIQUE (cpf)
);

CREATE INDEX idx_responsaveis_atleta ON responsaveis (atleta_id);

-- Garante que só existe um contato principal por atleta
CREATE UNIQUE INDEX uq_responsavel_principal_por_atleta
    ON responsaveis (atleta_id)
    WHERE contato_principal = TRUE;

-- -----------------------------------------------------------------------------

CREATE TABLE uniformes (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id     UUID        NOT NULL REFERENCES atletas (id) ON DELETE CASCADE,
    tam_camisa    VARCHAR(5)  NOT NULL,  -- PP, P, M, G, GG, XGG
    tam_short     VARCHAR(5)  NOT NULL,
    tam_chuteira  VARCHAR(5)  NOT NULL,  -- numeração
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_uniformes_atleta UNIQUE (atleta_id)
);

-- =============================================================================
-- CONTEXTO: TURMAS
-- =============================================================================

CREATE TABLE campos (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome          VARCHAR(100) NOT NULL,
    endereco      VARCHAR(200),
    capacidade_max INT,
    ativo         BOOLEAN     NOT NULL DEFAULT TRUE
);

-- -----------------------------------------------------------------------------

CREATE TABLE treinadores (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id    UUID        NOT NULL REFERENCES usuarios (id) ON DELETE RESTRICT,
    nome          VARCHAR(150) NOT NULL,
    cpf           CHAR(11),
    cref          VARCHAR(20),
    telefone      VARCHAR(15),
    status        status_treinador NOT NULL DEFAULT 'ATIVO',
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deletado_em   TIMESTAMPTZ,

    CONSTRAINT uq_treinadores_usuario UNIQUE (usuario_id),
    CONSTRAINT uq_treinadores_cpf     UNIQUE (cpf)
);

-- -----------------------------------------------------------------------------

CREATE TABLE turmas (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome             VARCHAR(100) NOT NULL,
    faixa_etaria_min INT          NOT NULL,
    faixa_etaria_max INT          NOT NULL,
    capacidade_max   INT          NOT NULL,
    treinador_id     UUID         REFERENCES treinadores (id) ON DELETE SET NULL,
    campo_id         UUID         REFERENCES campos (id) ON DELETE SET NULL,
    status           status_turma NOT NULL DEFAULT 'ATIVA',
    criado_em        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    deletado_em      TIMESTAMPTZ,

    CONSTRAINT chk_turma_faixa CHECK (
        faixa_etaria_min >= 4
        AND faixa_etaria_max <= 18
        AND faixa_etaria_min <= faixa_etaria_max
    ),
    CONSTRAINT chk_turma_capacidade CHECK (capacidade_max > 0)
);

CREATE INDEX idx_turmas_treinador ON turmas (treinador_id) WHERE deletado_em IS NULL;
CREATE INDEX idx_turmas_status    ON turmas (status)       WHERE deletado_em IS NULL;

-- -----------------------------------------------------------------------------

CREATE TABLE horarios_turma (
    id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id    UUID      NOT NULL REFERENCES turmas (id) ON DELETE CASCADE,
    dia_semana  dia_semana NOT NULL,
    hora_inicio TIME      NOT NULL,
    hora_fim    TIME      NOT NULL,

    CONSTRAINT chk_horario_horas CHECK (hora_fim > hora_inicio),
    CONSTRAINT uq_horario_turma_dia UNIQUE (turma_id, dia_semana)
);

CREATE INDEX idx_horarios_turma ON horarios_turma (turma_id);

-- -----------------------------------------------------------------------------

CREATE TABLE matriculas (
    id            UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id     UUID           NOT NULL REFERENCES atletas (id) ON DELETE RESTRICT,
    turma_id      UUID           NOT NULL REFERENCES turmas (id)  ON DELETE RESTRICT,
    data_inicio   DATE           NOT NULL,
    data_fim      DATE,
    status        status_matricula NOT NULL DEFAULT 'ATIVA',
    criado_em     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_matricula_datas CHECK (data_fim IS NULL OR data_fim > data_inicio)
);

CREATE INDEX idx_matriculas_atleta ON matriculas (atleta_id);
CREATE INDEX idx_matriculas_turma  ON matriculas (turma_id);
CREATE INDEX idx_matriculas_status ON matriculas (status);

-- Atleta não pode ter duas matrículas ativas na mesma turma
CREATE UNIQUE INDEX uq_matricula_ativa_por_turma
    ON matriculas (atleta_id, turma_id)
    WHERE status = 'ATIVA';

-- =============================================================================
-- CONTEXTO: FINANCEIRO
-- =============================================================================

CREATE TABLE planos (
    id               UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    nome             VARCHAR(100)   NOT NULL,
    dias_semana      INT            NOT NULL,
    valor_mensal     DECIMAL(10, 2) NOT NULL,
    dia_vencimento   INT            NOT NULL,
    ativo            BOOLEAN        NOT NULL DEFAULT TRUE,
    criado_em        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_plano_dias        CHECK (dias_semana IN (2, 3, 5)),
    CONSTRAINT chk_plano_valor       CHECK (valor_mensal > 0),
    CONSTRAINT chk_plano_vencimento  CHECK (dia_vencimento BETWEEN 1 AND 28)
);

-- -----------------------------------------------------------------------------

CREATE TABLE contratos (
    id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
    atleta_id         UUID           NOT NULL REFERENCES atletas (id) ON DELETE RESTRICT,
    plano_id          UUID           NOT NULL REFERENCES planos (id)  ON DELETE RESTRICT,
    data_inicio       DATE           NOT NULL,
    data_fim          DATE,
    valor_contratado  DECIMAL(10, 2) NOT NULL,
    status            status_contrato NOT NULL DEFAULT 'ATIVO',
    criado_em         TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    atualizado_em     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_contrato_datas CHECK (data_fim IS NULL OR data_fim > data_inicio),
    CONSTRAINT chk_contrato_valor CHECK (valor_contratado > 0)
);

CREATE INDEX idx_contratos_atleta ON contratos (atleta_id);
CREATE INDEX idx_contratos_status ON contratos (status);

-- Atleta não pode ter dois contratos ativos simultaneamente
CREATE UNIQUE INDEX uq_contrato_ativo_por_atleta
    ON contratos (atleta_id)
    WHERE status = 'ATIVO';

-- -----------------------------------------------------------------------------

CREATE TABLE mensalidades (
    id               UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
    contrato_id      UUID             NOT NULL REFERENCES contratos (id) ON DELETE RESTRICT,
    atleta_id        UUID             NOT NULL REFERENCES atletas (id)   ON DELETE RESTRICT,
    competencia_ano  INT              NOT NULL,
    competencia_mes  INT              NOT NULL,
    data_vencimento  DATE             NOT NULL,
    valor            DECIMAL(10, 2)   NOT NULL,
    valor_pago       DECIMAL(10, 2),
    status           status_mensalidade NOT NULL DEFAULT 'PENDENTE',
    data_pagamento   DATE,
    forma_pagamento  VARCHAR(50),
    observacao       TEXT,
    criado_em        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
    atualizado_em    TIMESTAMPTZ      NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_mensalidade_mes      CHECK (competencia_mes BETWEEN 1 AND 12),
    CONSTRAINT chk_mensalidade_valor    CHECK (valor > 0),
    CONSTRAINT chk_mensalidade_pago     CHECK (
        (status = 'PAGO' AND valor_pago IS NOT NULL AND data_pagamento IS NOT NULL)
        OR status != 'PAGO'
    ),
    -- Idempotência: uma mensalidade por contrato por competência
    CONSTRAINT uq_mensalidade_competencia UNIQUE (contrato_id, competencia_ano, competencia_mes)
);

CREATE INDEX idx_mensalidades_atleta     ON mensalidades (atleta_id);
CREATE INDEX idx_mensalidades_status     ON mensalidades (status);
CREATE INDEX idx_mensalidades_vencimento ON mensalidades (data_vencimento);
CREATE INDEX idx_mensalidades_competencia ON mensalidades (competencia_ano, competencia_mes);

-- =============================================================================
-- CONTEXTO: FREQUÊNCIA
-- =============================================================================

CREATE TABLE treinos (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    turma_id    UUID        NOT NULL REFERENCES turmas (id) ON DELETE RESTRICT,
    data_treino DATE        NOT NULL,
    hora_inicio TIME,
    hora_fim    TIME,
    observacao  TEXT,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_treino_horas CHECK (hora_fim IS NULL OR hora_fim > hora_inicio),
    -- Uma turma não pode ter dois treinos no mesmo dia
    CONSTRAINT uq_treino_turma_data UNIQUE (turma_id, data_treino)
);

CREATE INDEX idx_treinos_turma ON treinos (turma_id);
CREATE INDEX idx_treinos_data  ON treinos (data_treino);

-- -----------------------------------------------------------------------------

CREATE TABLE frequencias (
    id             UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
    treino_id      UUID      NOT NULL REFERENCES treinos (id)  ON DELETE CASCADE,
    atleta_id      UUID      NOT NULL REFERENCES atletas (id)  ON DELETE RESTRICT,
    presenca       presenca  NOT NULL DEFAULT 'AUSENTE',
    justificativa  TEXT,
    registrado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Um atleta tem uma frequência por treino
    CONSTRAINT uq_frequencia_treino_atleta UNIQUE (treino_id, atleta_id)
);

CREATE INDEX idx_frequencias_treino ON frequencias (treino_id);
CREATE INDEX idx_frequencias_atleta ON frequencias (atleta_id);

-- =============================================================================
-- TABELA DE SUPORTE: LOG DE JOBS
-- =============================================================================

CREATE TABLE job_execucoes (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    nome_job    VARCHAR(100) NOT NULL,
    status      VARCHAR(20)  NOT NULL,  -- SUCESSO, ERRO, PARCIAL
    mensagem    TEXT,
    payload     JSONB,
    executado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_job_execucoes_nome ON job_execucoes (nome_job);
CREATE INDEX idx_job_execucoes_data ON job_execucoes (executado_em);

-- =============================================================================
-- FUNÇÃO: atualizar atualizado_em automaticamente
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para todas as tabelas com atualizado_em
CREATE TRIGGER trg_usuarios_updated        BEFORE UPDATE ON usuarios        FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
CREATE TRIGGER trg_atletas_updated         BEFORE UPDATE ON atletas         FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
CREATE TRIGGER trg_responsaveis_updated    BEFORE UPDATE ON responsaveis    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
CREATE TRIGGER trg_uniformes_updated       BEFORE UPDATE ON uniformes       FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
CREATE TRIGGER trg_treinadores_updated     BEFORE UPDATE ON treinadores     FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
CREATE TRIGGER trg_turmas_updated          BEFORE UPDATE ON turmas          FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
CREATE TRIGGER trg_matriculas_updated      BEFORE UPDATE ON matriculas      FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
CREATE TRIGGER trg_planos_updated          BEFORE UPDATE ON planos          FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
CREATE TRIGGER trg_contratos_updated       BEFORE UPDATE ON contratos       FOR EACH ROW EXECUTE FUNCTION fn_atualizado_timestamp();
CREATE TRIGGER trg_mensalidades_updated    BEFORE UPDATE ON mensalidades    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- =============================================================================
-- FUNÇÃO: marcar mensalidades como VENCIDO (chamada pelo job diário)
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_marcar_mensalidades_vencidas()
RETURNS INT AS $$
DECLARE
    quantidade INT;
BEGIN
    UPDATE mensalidades
    SET    status = 'VENCIDO',
           atualizado_em = NOW()
    WHERE  status = 'PENDENTE'
    AND    data_vencimento < CURRENT_DATE;

    GET DIAGNOSTICS quantidade = ROW_COUNT;
    RETURN quantidade;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- DADOS INICIAIS (seed)
-- =============================================================================

-- Usuário administrador padrão (senha: trocar no primeiro login)
INSERT INTO usuarios (email, senha_hash, perfil)
VALUES ('admin@realtpmsys.local', '$2b$12$placeholder_hash_trocar', 'ADMIN');

-- Planos padrão
INSERT INTO planos (nome, dias_semana, valor_mensal, dia_vencimento) VALUES
    ('2x por semana',  2, 150.00, 10),
    ('3x por semana',  3, 200.00, 10),
    ('5x por semana',  5, 280.00, 10);
