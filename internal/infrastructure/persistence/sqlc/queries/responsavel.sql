-- name: GetResponsavelByID :one
SELECT *
FROM responsaveis
WHERE id = $1;

-- name: GetResponsavelByCPF :one
SELECT *
FROM responsaveis
WHERE cpf = $1
LIMIT 1;

-- name: ListResponsaveisDoAtleta :many
SELECT *
FROM responsaveis
WHERE atleta_id = $1
ORDER BY contato_principal DESC, criado_em;

-- name: GetPrincipalDoAtleta :one
SELECT *
FROM responsaveis
WHERE atleta_id = $1
  AND contato_principal = TRUE
LIMIT 1;

-- name: DespromoverPrincipalDoAtleta :exec
-- Usado dentro da mesma transação do upsert quando o novo responsável vai
-- ser marcado como principal. Sem WHERE id != $2 (vamos remover o antigo
-- antes de inserir o novo, ou despromover todos antes do upsert).
UPDATE responsaveis
SET contato_principal = FALSE,
    atualizado_em     = NOW()
WHERE atleta_id = $1
  AND contato_principal = TRUE;

-- name: UpsertResponsavel :one
INSERT INTO responsaveis (
    id, atleta_id, nome, cpf, email, telefone, parentesco, contato_principal,
    criado_em, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome              = EXCLUDED.nome,
    cpf               = EXCLUDED.cpf,
    email             = EXCLUDED.email,
    telefone          = EXCLUDED.telefone,
    parentesco        = EXCLUDED.parentesco,
    contato_principal = EXCLUDED.contato_principal,
    atualizado_em     = NOW()
RETURNING *;

-- name: DeleteResponsavel :exec
DELETE FROM responsaveis
WHERE id = $1;
