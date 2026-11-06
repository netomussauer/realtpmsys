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
