-- name: GetTreinoByID :one
SELECT *
FROM treinos
WHERE id = $1;

-- name: GetTreinoByTurmaData :one
SELECT *
FROM treinos
WHERE turma_id = $1
  AND data_treino = $2
LIMIT 1;

-- name: ListTreinosPorTurma :many
SELECT *
FROM treinos
WHERE turma_id = sqlc.arg(turma_id)
  AND (sqlc.narg(data_inicio)::date IS NULL OR data_treino >= sqlc.narg(data_inicio))
  AND (sqlc.narg(data_fim)::date    IS NULL OR data_treino <= sqlc.narg(data_fim))
ORDER BY data_treino DESC
LIMIT  sqlc.arg(lim)
OFFSET sqlc.arg(off);

-- name: CountTreinosPorTurma :one
SELECT COUNT(*)
FROM treinos
WHERE turma_id = sqlc.arg(turma_id)
  AND (sqlc.narg(data_inicio)::date IS NULL OR data_treino >= sqlc.narg(data_inicio))
  AND (sqlc.narg(data_fim)::date    IS NULL OR data_treino <= sqlc.narg(data_fim));

-- name: UpsertTreino :one
INSERT INTO treinos (
    id, turma_id, data_treino, hora_inicio, hora_fim, observacao, criado_em
) VALUES (
    $1, $2, $3, $4, $5, $6, NOW()
)
ON CONFLICT (turma_id, data_treino) DO UPDATE SET
    hora_inicio = EXCLUDED.hora_inicio,
    hora_fim    = EXCLUDED.hora_fim,
    observacao  = EXCLUDED.observacao
RETURNING *;
