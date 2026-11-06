-- name: GetUsuarioByEmail :one
SELECT *
FROM usuarios
WHERE email = $1
  AND deletado_em IS NULL;

-- name: GetUsuarioByID :one
SELECT *
FROM usuarios
WHERE id = $1
  AND deletado_em IS NULL;

-- name: ListUsuarios :many
SELECT *
FROM usuarios
WHERE deletado_em IS NULL
  AND (sqlc.narg(busca)::text  IS NULL
       OR email ILIKE '%' || sqlc.narg(busca) || '%'
       OR nome  ILIKE '%' || sqlc.narg(busca) || '%')
  AND (sqlc.narg(perfil)::text IS NULL OR perfil::text = sqlc.narg(perfil))
  AND (sqlc.narg(ativo)::boolean IS NULL OR ativo = sqlc.narg(ativo))
ORDER BY COALESCE(nome, email), email
LIMIT  sqlc.arg(lim)
OFFSET sqlc.arg(off);

-- name: CountUsuarios :one
SELECT COUNT(*)
FROM usuarios
WHERE deletado_em IS NULL
  AND (sqlc.narg(busca)::text  IS NULL
       OR email ILIKE '%' || sqlc.narg(busca) || '%'
       OR nome  ILIKE '%' || sqlc.narg(busca) || '%')
  AND (sqlc.narg(perfil)::text IS NULL OR perfil::text = sqlc.narg(perfil))
  AND (sqlc.narg(ativo)::boolean IS NULL OR ativo = sqlc.narg(ativo));

-- name: UpsertUsuario :one
INSERT INTO usuarios (
    id, email, nome, senha_hash, perfil, ativo, deve_trocar_senha,
    criado_em, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5, $6, $7,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    email             = EXCLUDED.email,
    nome              = EXCLUDED.nome,
    senha_hash        = EXCLUDED.senha_hash,
    perfil            = EXCLUDED.perfil,
    ativo             = EXCLUDED.ativo,
    deve_trocar_senha = EXCLUDED.deve_trocar_senha,
    atualizado_em     = NOW()
RETURNING *;

-- name: CountAdminsAtivos :one
SELECT COUNT(*)
FROM usuarios
WHERE perfil = 'ADMIN'
  AND ativo = TRUE
  AND deletado_em IS NULL;
