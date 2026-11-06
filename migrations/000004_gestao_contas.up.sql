-- Migration: 000004_gestao_contas.up.sql
--
-- Gestão de contas (ADR-013):
--   * usuarios.nome              — rótulo legível na listagem (opcional: contas
--                                  semeadas por 000002/000003 não têm nome).
--   * usuarios.deve_trocar_senha — força troca no próximo login (senha temporária).
--   * refresh_tokens             — refresh tokens persistidos (apenas o hash
--                                  SHA-256), rotativos e revogáveis. `familia_id`
--                                  agrupa a cadeia de rotação de um login: reuso
--                                  de um token já rotacionado revoga a família.
--
-- Aditiva e não destrutiva: nenhuma linha existente é alterada.

ALTER TABLE usuarios
    ADD COLUMN nome              VARCHAR(150),
    ADD COLUMN deve_trocar_senha BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id  UUID        NOT NULL REFERENCES usuarios (id),
    familia_id  UUID        NOT NULL,
    token_hash  CHAR(64)    NOT NULL,
    expira_em   TIMESTAMPTZ NOT NULL,
    revogado_em TIMESTAMPTZ,
    criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash)
);

CREATE INDEX idx_refresh_tokens_usuario ON refresh_tokens (usuario_id) WHERE revogado_em IS NULL;
CREATE INDEX idx_refresh_tokens_familia ON refresh_tokens (familia_id);
CREATE INDEX idx_refresh_tokens_expira  ON refresh_tokens (expira_em);
