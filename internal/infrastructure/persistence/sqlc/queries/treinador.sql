-- name: GetTreinadorByID :one
SELECT *
FROM treinadores
WHERE id = $1
  AND deletado_em IS NULL;

-- name: GetTreinadorByCPF :one
SELECT *
FROM treinadores
WHERE cpf = $1
  AND deletado_em IS NULL;

-- name: GetTreinadorByUsuarioID :one
SELECT *
FROM treinadores
WHERE usuario_id = $1
  AND deletado_em IS NULL;

-- name: ListTreinadores :many
SELECT *
FROM treinadores
WHERE deletado_em IS NULL
  AND (sqlc.narg(nome)::text   IS NULL OR nome   ILIKE '%' || sqlc.narg(nome)   || '%')
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
ORDER BY nome
LIMIT  sqlc.arg(lim)
OFFSET sqlc.arg(off);

-- name: CountTreinadores :one
SELECT COUNT(*)
FROM treinadores
WHERE deletado_em IS NULL
  AND (sqlc.narg(nome)::text   IS NULL OR nome   ILIKE '%' || sqlc.narg(nome)   || '%')
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status));

-- name: UpsertTreinador :one
INSERT INTO treinadores (
    id, usuario_id, nome, cpf, cref, telefone, status,
    criado_em, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome          = EXCLUDED.nome,
    cpf           = EXCLUDED.cpf,
    cref          = EXCLUDED.cref,
    telefone      = EXCLUDED.telefone,
    status        = EXCLUDED.status,
    atualizado_em = NOW()
RETURNING *;

-- name: SoftDeleteTreinador :exec
UPDATE treinadores
SET
    deletado_em   = NOW(),
    status        = 'INATIVO',
    atualizado_em = NOW()
WHERE id = $1
  AND deletado_em IS NULL;
