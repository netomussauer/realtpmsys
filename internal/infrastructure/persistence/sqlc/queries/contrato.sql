-- name: GetContratoByID :one
SELECT *
FROM contratos
WHERE id = $1;

-- name: GetContratoAtivoPorAtleta :one
SELECT *
FROM contratos
WHERE atleta_id = $1
  AND status    = 'ATIVO'
LIMIT 1;

-- name: ListContratosAtivos :many
SELECT c.*, p.dia_vencimento
FROM contratos c
JOIN planos    p ON p.id = c.plano_id
WHERE c.status = 'ATIVO';

-- name: InsertContrato :one
INSERT INTO contratos (
    id, atleta_id, plano_id,
    data_inicio, valor_contratado, status,
    criado_em, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5, $6,
    NOW(), NOW()
)
RETURNING *;

-- name: UpdateContratoStatus :one
UPDATE contratos
SET
    status        = $2,
    data_fim      = $3,
    atualizado_em = NOW()
WHERE id = $1
RETURNING *;
