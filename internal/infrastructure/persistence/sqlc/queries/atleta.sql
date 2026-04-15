-- name: GetAtletaByID :one
SELECT *
FROM atletas
WHERE id = $1
  AND deletado_em IS NULL;

-- name: GetAtletaByCPF :one
SELECT *
FROM atletas
WHERE cpf = $1
  AND deletado_em IS NULL;

-- name: ListAtletas :many
SELECT *
FROM atletas
WHERE deletado_em IS NULL
  AND (sqlc.narg(nome)::text   IS NULL OR nome   ILIKE '%' || sqlc.narg(nome)   || '%')
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
ORDER BY nome
LIMIT  sqlc.arg(lim)
OFFSET sqlc.arg(off);

-- name: CountAtletas :one
SELECT COUNT(*)
FROM atletas
WHERE deletado_em IS NULL
  AND (sqlc.narg(nome)::text   IS NULL OR nome   ILIKE '%' || sqlc.narg(nome)   || '%')
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status));

-- name: InsertAtleta :one
INSERT INTO atletas (
    id, nome, data_nascimento, cpf, rg,
    endereco, cidade, uf, cep,
    email, telefone, status,
    criado_em, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9,
    $10, $11, $12,
    NOW(), NOW()
)
RETURNING *;

-- name: UpdateAtleta :one
UPDATE atletas
SET
    nome            = $2,
    data_nascimento = $3,
    cpf             = $4,
    email           = $5,
    telefone        = $6,
    status          = $7,
    atualizado_em   = NOW()
WHERE id = $1
  AND deletado_em IS NULL
RETURNING *;

-- name: SoftDeleteAtleta :exec
UPDATE atletas
SET
    deletado_em   = NOW(),
    status        = 'INATIVO',
    atualizado_em = NOW()
WHERE id = $1
  AND deletado_em IS NULL;
