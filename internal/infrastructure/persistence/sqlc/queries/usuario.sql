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
