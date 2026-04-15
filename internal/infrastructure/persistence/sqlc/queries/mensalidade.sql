-- name: GetMensalidadeByID :one
SELECT *
FROM mensalidades
WHERE id = $1;

-- name: GetMensalidadeByContratoCompetencia :one
SELECT *
FROM mensalidades
WHERE contrato_id = $1
  AND competencia_ano = $2
  AND competencia_mes = $3;

-- name: ListMensalidades :many
SELECT *
FROM mensalidades
WHERE (sqlc.narg(atleta_id)::uuid   IS NULL OR atleta_id = sqlc.narg(atleta_id))
  AND (sqlc.narg(status)::text      IS NULL OR status    = sqlc.narg(status))
  AND (sqlc.narg(comp_ano)::int     IS NULL OR competencia_ano = sqlc.narg(comp_ano))
  AND (sqlc.narg(comp_mes)::int     IS NULL OR competencia_mes = sqlc.narg(comp_mes))
ORDER BY data_vencimento
LIMIT  sqlc.arg(lim)
OFFSET sqlc.arg(off);

-- name: CountMensalidades :one
SELECT COUNT(*)
FROM mensalidades
WHERE (sqlc.narg(atleta_id)::uuid IS NULL OR atleta_id = sqlc.narg(atleta_id))
  AND (sqlc.narg(status)::text    IS NULL OR status    = sqlc.narg(status))
  AND (sqlc.narg(comp_ano)::int   IS NULL OR competencia_ano = sqlc.narg(comp_ano))
  AND (sqlc.narg(comp_mes)::int   IS NULL OR competencia_mes = sqlc.narg(comp_mes));

-- name: InsertMensalidade :one
INSERT INTO mensalidades (
    id, contrato_id, atleta_id,
    competencia_ano, competencia_mes,
    data_vencimento, valor, status,
    criado_em, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    NOW(), NOW()
)
RETURNING *;

-- name: UpdateMensalidadePagamento :one
UPDATE mensalidades
SET
    status          = 'PAGO',
    valor_pago      = $2,
    data_pagamento  = $3,
    forma_pagamento = $4,
    observacao      = $5,
    atualizado_em   = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateMensalidadeStatus :one
UPDATE mensalidades
SET
    status        = $2,
    atualizado_em = NOW()
WHERE id = $1
RETURNING *;

-- name: MarcarMensalidadesVencidas :execresult
UPDATE mensalidades
SET
    status        = 'VENCIDO',
    atualizado_em = NOW()
WHERE status          = 'PENDENTE'
  AND data_vencimento < CURRENT_DATE;
