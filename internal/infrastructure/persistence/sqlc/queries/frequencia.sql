-- name: ListFrequenciasPorTreino :many
SELECT *
FROM frequencias
WHERE treino_id = $1
ORDER BY registrado_em;

-- name: UpsertFrequencia :one
INSERT INTO frequencias (
    id, treino_id, atleta_id, presenca, justificativa, registrado_em
) VALUES (
    $1, $2, $3, $4, $5, NOW()
)
ON CONFLICT (treino_id, atleta_id) DO UPDATE SET
    presenca      = EXCLUDED.presenca,
    justificativa = EXCLUDED.justificativa,
    registrado_em = NOW()
RETURNING *;
