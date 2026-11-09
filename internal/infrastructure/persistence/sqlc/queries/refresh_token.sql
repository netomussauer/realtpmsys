-- name: InsertRefreshToken :exec
INSERT INTO refresh_tokens (
    id, usuario_id, familia_id, token_hash, expira_em, criado_em
) VALUES (
    $1, $2, $3, $4, $5, $6
);

-- name: GetRefreshTokenByHash :one
SELECT *
FROM refresh_tokens
WHERE token_hash = $1;

-- name: RevogarRefreshToken :exec
UPDATE refresh_tokens
SET revogado_em = NOW()
WHERE id = $1
  AND revogado_em IS NULL;

-- name: RevogarRefreshTokensDaFamilia :exec
UPDATE refresh_tokens
SET revogado_em = NOW()
WHERE familia_id = $1
  AND revogado_em IS NULL;

-- name: RevogarRefreshTokensDoUsuario :exec
UPDATE refresh_tokens
SET revogado_em = NOW()
WHERE usuario_id = $1
  AND revogado_em IS NULL;

-- name: RevogarRefreshTokensDoUsuarioExceto :exec
UPDATE refresh_tokens
SET revogado_em = NOW()
WHERE usuario_id = $1
  AND familia_id <> $2
  AND revogado_em IS NULL;

-- name: RevogarRefreshTokenSeAtivo :execrows
-- Revogação atômica do token pai na rotação: só UMA de duas requisições
-- concorrentes com o mesmo token afeta a linha (rows = 1).
UPDATE refresh_tokens
SET revogado_em = NOW()
WHERE id = $1
  AND revogado_em IS NULL;

-- name: PurgarRefreshTokensExpirados :execrows
-- Remove refresh tokens cuja expiração é anterior a $1. Só os JÁ EXPIRADOS: um
-- token revogado mas ainda dentro da validade precisa permanecer, pois é ele
-- que permite detectar o reuso (token consumido reapresentado). Usa
-- idx_refresh_tokens_expira.
DELETE FROM refresh_tokens
WHERE expira_em < $1;
