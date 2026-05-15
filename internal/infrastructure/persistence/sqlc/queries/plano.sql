-- name: GetPlanoByID :one
SELECT *
FROM planos
WHERE id = $1;

-- name: ListPlanosAtivos :many
SELECT *
FROM planos
WHERE ativo = TRUE
ORDER BY valor_mensal;

-- name: UpsertPlano :one
INSERT INTO planos (
    id, nome, dias_semana, valor_mensal, dia_vencimento, ativo,
    criado_em, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5, $6,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome           = EXCLUDED.nome,
    dias_semana    = EXCLUDED.dias_semana,
    valor_mensal   = EXCLUDED.valor_mensal,
    dia_vencimento = EXCLUDED.dia_vencimento,
    ativo          = EXCLUDED.ativo,
    atualizado_em  = NOW()
RETURNING *;
