-- Migration: 000001_initial_schema.down.sql
-- Reverte a migration inicial — DROP na ordem inversa das FKs

DROP TABLE IF EXISTS job_execucoes;
DROP TABLE IF EXISTS frequencias;
DROP TABLE IF EXISTS treinos;
DROP TABLE IF EXISTS mensalidades;
DROP TABLE IF EXISTS contratos;
DROP TABLE IF EXISTS planos;
DROP TABLE IF EXISTS matriculas;
DROP TABLE IF EXISTS horarios_turma;
DROP TABLE IF EXISTS turmas;
DROP TABLE IF EXISTS treinadores;
DROP TABLE IF EXISTS campos;
DROP TABLE IF EXISTS uniformes;
DROP TABLE IF EXISTS responsaveis;
DROP TABLE IF EXISTS atletas;
DROP TABLE IF EXISTS usuarios;

DROP FUNCTION IF EXISTS fn_atualizar_timestamp;

DROP TYPE IF EXISTS presenca;
DROP TYPE IF EXISTS status_mensalidade;
DROP TYPE IF EXISTS status_contrato;
DROP TYPE IF EXISTS status_matricula;
DROP TYPE IF EXISTS dia_semana;
DROP TYPE IF EXISTS status_turma;
DROP TYPE IF EXISTS status_treinador;
DROP TYPE IF EXISTS parentesco;
DROP TYPE IF EXISTS status_atleta;
DROP TYPE IF EXISTS perfil_usuario;
