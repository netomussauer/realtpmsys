-- name: GetUniformeByAtleta :one
SELECT *
FROM uniformes
WHERE atleta_id = $1;

-- name: UpsertUniforme :one
-- Upsert por atleta_id (constraint uq_uniformes_atleta). Mantém ID estável
-- mesmo em updates: ON CONFLICT (atleta_id) preserva o id existente.
INSERT INTO uniformes (
    id, atleta_id, tam_camisa, tam_short, tam_chuteira, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5, NOW()
)
ON CONFLICT (atleta_id) DO UPDATE SET
    tam_camisa    = EXCLUDED.tam_camisa,
    tam_short     = EXCLUDED.tam_short,
    tam_chuteira  = EXCLUDED.tam_chuteira,
    atualizado_em = NOW()
RETURNING *;
