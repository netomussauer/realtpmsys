-- Migration: 000002_admin_password.up.sql
-- Substitui o placeholder do hash de senha do admin por um bcrypt válido.
-- Senha inicial: admin123 (TROCAR EM PRODUÇÃO).

UPDATE usuarios
SET senha_hash = '$2a$12$ZbekP10KRBCd2GsZOgHPqeOvzu8KRL0Vp/eQ.f7NEVK0PwHtiTWgK'
WHERE email = 'admin@realtpmsys.local'
  AND senha_hash = '$2a$12$placeholder_trocar_no_primeiro_login';
