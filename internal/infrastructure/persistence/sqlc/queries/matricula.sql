-- name: GetMatriculaByID :one
SELECT *
FROM matriculas
WHERE id = $1;

-- name: GetMatriculaAtivaByAtletaTurma :one
SELECT *
FROM matriculas
WHERE atleta_id = $1
  AND turma_id  = $2
  AND status    = 'ATIVA'
LIMIT 1;

-- name: ListMatriculasPorTurma :many
SELECT *
FROM matriculas
WHERE turma_id = sqlc.arg(turma_id)
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
ORDER BY criado_em DESC
LIMIT  sqlc.arg(lim)
OFFSET sqlc.arg(off);

-- name: CountMatriculasPorTurma :one
SELECT COUNT(*)
FROM matriculas
WHERE turma_id = sqlc.arg(turma_id)
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status));

-- name: CountMatriculasAtivasPorTurma :one
SELECT COUNT(*)
FROM matriculas
WHERE turma_id = $1
  AND status   = 'ATIVA';

-- name: UpsertMatricula :one
INSERT INTO matriculas (
    id, atleta_id, turma_id, data_inicio, data_fim, status,
    criado_em, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5, $6,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    data_fim      = EXCLUDED.data_fim,
    status        = EXCLUDED.status,
    atualizado_em = NOW()
RETURNING *;
