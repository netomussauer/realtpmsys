-- Migration: 000003_seed_responsavel.up.sql
--
-- Cria usuário RESPONSAVEL de teste e vincula ao primeiro atleta ativo
-- existente. Permite smoke do fluxo de autoatendimento sem depender de
-- endpoint de gerenciamento de usuários (não implementado).
--
-- Credenciais: responsavel@realtpmsys.local / Test@1234
-- Hash bcrypt cost=12 gerado a partir de Test@1234 — TROCAR EM PRODUÇÃO.
--
-- Idempotente: se o usuário já existir não duplica; se nenhum atleta ativo
-- existir o UPDATE é no-op (responsável fica sem filhos vinculados).

INSERT INTO usuarios (id, email, senha_hash, perfil, ativo, criado_em, atualizado_em)
VALUES (
    '5e3c1f9c-7c91-4e62-9b3d-2b9f0c2a0d11',
    'responsavel@realtpmsys.local',
    '$2b$12$Uj6gTVhXWwFLcH2nHqXFG.N9nFePv.l0uuTbjhgjeXVksAPYQYwQu',
    'RESPONSAVEL',
    TRUE,
    NOW(),
    NOW()
)
ON CONFLICT (email) DO NOTHING;

-- Vincula esse usuário ao primeiro atleta ativo encontrado.
-- A subquery garante atomicidade — ou atualiza um atleta, ou nenhum.
UPDATE atletas
SET    usuario_responsavel_id = '5e3c1f9c-7c91-4e62-9b3d-2b9f0c2a0d11',
       atualizado_em          = NOW()
WHERE  id = (
    SELECT id
    FROM   atletas
    WHERE  deletado_em IS NULL
      AND  status = 'ATIVO'
      AND  usuario_responsavel_id IS NULL
    ORDER BY criado_em
    LIMIT 1
);
