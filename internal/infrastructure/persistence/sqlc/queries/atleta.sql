-- name: GetAtletaByID :one
SELECT *
FROM atletas
WHERE id = $1
  AND deletado_em IS NULL;

-- name: GetAtletaByIDPorResponsavel :one
-- Versão escopada do GetAtletaByID — devolve linha apenas se o atleta
-- pertencer ao usuário responsável informado. Usada para autorizar GETs
-- vindos do perfil RESPONSAVEL (404 silencioso quando não bate).
SELECT *
FROM atletas
WHERE id                     = $1
  AND usuario_responsavel_id = $2
  AND deletado_em            IS NULL;

-- name: IsAtletaDoResponsavel :one
-- Sentinela barata para rotas que precisam autorizar mas não usam a linha
-- do atleta em si (ex.: /responsaveis, /uniforme). Devolve TRUE se o atleta
-- ATIVO/INATIVO/SUSPENSO existir e pertencer ao responsável.
SELECT EXISTS(
    SELECT 1
    FROM   atletas
    WHERE  id                     = $1
      AND  usuario_responsavel_id = $2
      AND  deletado_em            IS NULL
);

-- name: GetAtletaByCPF :one
SELECT *
FROM atletas
WHERE cpf = $1
  AND deletado_em IS NULL;

-- name: ListAtletas :many
SELECT *
FROM atletas
WHERE deletado_em IS NULL
  AND (sqlc.narg(nome)::text   IS NULL OR nome   ILIKE '%' || sqlc.narg(nome)   || '%')
  AND (sqlc.narg(status)::text IS NULL OR status::text = sqlc.narg(status))
ORDER BY nome
LIMIT  sqlc.arg(lim)
OFFSET sqlc.arg(off);

-- name: CountAtletas :one
SELECT COUNT(*)
FROM atletas
WHERE deletado_em IS NULL
  AND (sqlc.narg(nome)::text   IS NULL OR nome   ILIKE '%' || sqlc.narg(nome)   || '%')
  AND (sqlc.narg(status)::text IS NULL OR status::text = sqlc.narg(status));

-- name: UpsertAtleta :one
INSERT INTO atletas (
    id, nome, data_nascimento, cpf, rg,
    endereco, cidade, uf, cep,
    email, telefone, status, usuario_responsavel_id,
    criado_em, atualizado_em
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9,
    $10, $11, $12, $13,
    NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
    nome                   = EXCLUDED.nome,
    data_nascimento        = EXCLUDED.data_nascimento,
    cpf                    = EXCLUDED.cpf,
    rg                     = EXCLUDED.rg,
    endereco               = EXCLUDED.endereco,
    cidade                 = EXCLUDED.cidade,
    uf                     = EXCLUDED.uf,
    cep                    = EXCLUDED.cep,
    email                  = EXCLUDED.email,
    telefone               = EXCLUDED.telefone,
    status                 = EXCLUDED.status,
    usuario_responsavel_id = EXCLUDED.usuario_responsavel_id,
    atualizado_em          = NOW()
RETURNING *;

-- name: SoftDeleteAtleta :exec
UPDATE atletas
SET
    deletado_em   = NOW(),
    status        = 'INATIVO',
    atualizado_em = NOW()
WHERE id = $1
  AND deletado_em IS NULL;
