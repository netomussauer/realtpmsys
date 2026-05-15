-- name: GetTurmaByID :one
SELECT *
FROM turmas
WHERE id = $1
  AND deletado_em IS NULL;

-- name: ListTurmas :many
SELECT *
FROM turmas
WHERE deletado_em IS NULL
  AND (sqlc.narg(nome)::text   IS NULL OR nome   ILIKE '%' || sqlc.narg(nome)   || '%')
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status))
ORDER BY nome
LIMIT  sqlc.arg(lim)
OFFSET sqlc.arg(off);

-- name: CountTurmas :one
SELECT COUNT(*)
FROM turmas
WHERE deletado_em IS NULL
  AND (sqlc.narg(nome)::text   IS NULL OR nome   ILIKE '%' || sqlc.narg(nome)   || '%')
  AND (sqlc.narg(status)::text IS NULL OR status = sqlc.narg(status));

-- name: UpsertTurma :one
INSERT INTO turmas (
    id, nome, faixa_etaria_min, faixa_etaria_max, capacidade_max,
    treinador_id, campo_id, status,
    criado_em, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome             = EXCLUDED.nome,
    faixa_etaria_min = EXCLUDED.faixa_etaria_min,
    faixa_etaria_max = EXCLUDED.faixa_etaria_max,
    capacidade_max   = EXCLUDED.capacidade_max,
    treinador_id     = EXCLUDED.treinador_id,
    campo_id         = EXCLUDED.campo_id,
    status           = EXCLUDED.status,
    atualizado_em    = NOW()
RETURNING *;

-- name: SoftDeleteTurma :exec
UPDATE turmas
SET
    deletado_em   = NOW(),
    status        = 'ENCERRADA',
    atualizado_em = NOW()
WHERE id = $1
  AND deletado_em IS NULL;

-- name: DeleteHorariosByTurma :exec
DELETE FROM horarios_turma WHERE turma_id = $1;

-- name: InsertHorarioTurma :exec
INSERT INTO horarios_turma (id, turma_id, dia_semana, hora_inicio, hora_fim)
VALUES ($1, $2, $3, $4, $5);

-- name: ListHorariosPorTurma :many
SELECT *
FROM horarios_turma
WHERE turma_id = $1
ORDER BY dia_semana, hora_inicio;
