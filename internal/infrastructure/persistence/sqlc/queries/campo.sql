-- name: GetCampoByID :one
SELECT *
FROM campos
WHERE id = $1;

-- name: ListCampos :many
SELECT *
FROM campos
WHERE (sqlc.narg(nome)::text  IS NULL OR nome ILIKE '%' || sqlc.narg(nome) || '%')
  AND (sqlc.narg(ativo)::bool IS NULL OR ativo = sqlc.narg(ativo))
ORDER BY nome
LIMIT  sqlc.arg(lim)
OFFSET sqlc.arg(off);

-- name: CountCampos :one
SELECT COUNT(*)
FROM campos
WHERE (sqlc.narg(nome)::text  IS NULL OR nome ILIKE '%' || sqlc.narg(nome) || '%')
  AND (sqlc.narg(ativo)::bool IS NULL OR ativo = sqlc.narg(ativo));

-- name: UpsertCampo :one
INSERT INTO campos (id, nome, endereco, capacidade_max, ativo)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (id) DO UPDATE SET
    nome           = EXCLUDED.nome,
    endereco       = EXCLUDED.endereco,
    capacidade_max = EXCLUDED.capacidade_max,
    ativo          = EXCLUDED.ativo
RETURNING *;
