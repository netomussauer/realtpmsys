-- ──────────────────────────────────────────────────────────────────────────────
-- INADIMPLÊNCIA
-- ──────────────────────────────────────────────────────────────────────────────

-- name: ListInadimplencia :many
-- Mensalidades em atraso (data_vencimento < hoje, status PENDENTE ou VENCIDO),
-- com dados do atleta. Filtra opcionalmente por competência ano/mês.
SELECT
    m.id,
    m.atleta_id,
    a.nome                                  AS atleta_nome,
    a.telefone                              AS atleta_telefone,
    a.email                                 AS atleta_email,
    m.competencia_ano,
    m.competencia_mes,
    m.data_vencimento,
    m.valor,
    m.status,
    (CURRENT_DATE - m.data_vencimento)::int AS dias_em_atraso
FROM mensalidades m
JOIN atletas      a ON a.id = m.atleta_id
WHERE m.status IN ('PENDENTE', 'VENCIDO')
  AND m.data_vencimento < CURRENT_DATE
  AND (sqlc.narg(ano)::int IS NULL OR m.competencia_ano = sqlc.narg(ano))
  AND (sqlc.narg(mes)::int IS NULL OR m.competencia_mes = sqlc.narg(mes))
  AND a.deletado_em IS NULL
ORDER BY m.data_vencimento;

-- name: ResumoInadimplencia :one
-- Totalizadores do mesmo recorte da consulta acima.
SELECT
    COUNT(*)::bigint                  AS total_mensalidades,
    COUNT(DISTINCT m.atleta_id)::bigint AS total_atletas,
    COALESCE(SUM(m.valor), 0)::numeric AS total_devido
FROM mensalidades m
JOIN atletas      a ON a.id = m.atleta_id
WHERE m.status IN ('PENDENTE', 'VENCIDO')
  AND m.data_vencimento < CURRENT_DATE
  AND (sqlc.narg(ano)::int IS NULL OR m.competencia_ano = sqlc.narg(ano))
  AND (sqlc.narg(mes)::int IS NULL OR m.competencia_mes = sqlc.narg(mes))
  AND a.deletado_em IS NULL;

-- ──────────────────────────────────────────────────────────────────────────────
-- FREQUÊNCIA POR ATLETA
-- ──────────────────────────────────────────────────────────────────────────────

-- name: FrequenciaAtleta :one
-- Agregado de presenças do atleta no período (somente treinos que tiveram
-- frequência lançada). Não considera treinos sem lançamento como ausente.
SELECT
    COUNT(*) FILTER (WHERE f.presenca = 'PRESENTE')    ::bigint AS presentes,
    COUNT(*) FILTER (WHERE f.presenca = 'AUSENTE')     ::bigint AS ausentes,
    COUNT(*) FILTER (WHERE f.presenca = 'JUSTIFICADO') ::bigint AS justificados,
    COUNT(*)                                            ::bigint AS total
FROM frequencias f
JOIN treinos     t ON t.id = f.treino_id
WHERE f.atleta_id = sqlc.arg(atleta_id)
  AND t.data_treino BETWEEN sqlc.arg(data_inicio) AND sqlc.arg(data_fim);

-- ──────────────────────────────────────────────────────────────────────────────
-- FREQUÊNCIA CONSOLIDADA POR TURMA
-- ──────────────────────────────────────────────────────────────────────────────

-- name: TotalTreinosTurma :one
SELECT COUNT(*)::bigint AS total
FROM treinos
WHERE turma_id = sqlc.arg(turma_id)
  AND data_treino BETWEEN sqlc.arg(data_inicio) AND sqlc.arg(data_fim);

-- name: FrequenciaTurmaPorAtleta :many
-- Resumo por atleta da turma no período.
SELECT
    f.atleta_id,
    a.nome                                            AS atleta_nome,
    COUNT(*) FILTER (WHERE f.presenca = 'PRESENTE')    ::bigint AS presentes,
    COUNT(*) FILTER (WHERE f.presenca = 'AUSENTE')     ::bigint AS ausentes,
    COUNT(*) FILTER (WHERE f.presenca = 'JUSTIFICADO') ::bigint AS justificados,
    COUNT(*)                                            ::bigint AS total
FROM frequencias f
JOIN treinos     t ON t.id = f.treino_id
JOIN atletas     a ON a.id = f.atleta_id
WHERE t.turma_id = sqlc.arg(turma_id)
  AND t.data_treino BETWEEN sqlc.arg(data_inicio) AND sqlc.arg(data_fim)
GROUP BY f.atleta_id, a.nome
ORDER BY a.nome;
