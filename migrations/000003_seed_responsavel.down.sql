-- Reverte migration 000003: desvincula atletas do usuário seed e remove o usuário.
-- Não há risco de cascade — atletas.usuario_responsavel_id usa ON DELETE SET NULL.

UPDATE atletas
SET    usuario_responsavel_id = NULL,
       atualizado_em          = NOW()
WHERE  usuario_responsavel_id = '5e3c1f9c-7c91-4e62-9b3d-2b9f0c2a0d11';

DELETE FROM usuarios
WHERE id = '5e3c1f9c-7c91-4e62-9b3d-2b9f0c2a0d11';
