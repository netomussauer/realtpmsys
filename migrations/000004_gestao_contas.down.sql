-- Migration: 000004_gestao_contas.down.sql
-- Reverte a gestão de contas. Descarta os refresh tokens persistidos
-- (os usuários precisarão fazer login de novo) e as colunas novas de usuarios.

DROP TABLE IF EXISTS refresh_tokens;

ALTER TABLE usuarios
    DROP COLUMN IF EXISTS deve_trocar_senha,
    DROP COLUMN IF EXISTS nome;
