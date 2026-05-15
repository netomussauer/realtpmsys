-- Migration: 000002_admin_password.down.sql
-- Reverte o hash do admin para o placeholder original.

UPDATE usuarios
SET senha_hash = '$2a$12$placeholder_trocar_no_primeiro_login'
WHERE email = 'admin@realtpmsys.local';
