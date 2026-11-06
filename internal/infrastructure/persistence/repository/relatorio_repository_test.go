//go:build integration

package repository

import (
	"context"
	"testing"
	"time"

	domfreq "github.com/realtpmsys/realtpmsys/internal/domain/frequencia"
	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// TestRelatorioRepository_Inadimplencia verifica o JOIN mensalidades+atletas
// + filtro de status (PENDENTE/VENCIDO) + filtro de data_vencimento < hoje.
func TestRelatorioRepository_Inadimplencia(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	planoRepo := NewPgxPlanoRepository(pool)
	contratoRepo := NewPgxContratoRepository(pool)
	mensRepo := NewPgxMensalidadeRepository(pool)
	relRepo := NewPgxRelatorioRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))
	p := novoPlano(t, "P")
	require.NoError(t, planoRepo.Save(ctx, p))
	c, _ := financeiro.NewContrato(a.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(150))
	require.NoError(t, contratoRepo.Save(ctx, c))

	// 1 vencida (passado, status PENDENTE → entra), 1 paga (não entra),
	// 1 futura (não entra)
	vencida := novaMensalidade(a.ID, c.ID, 2024, 12, 150)
	paga := novaMensalidade(a.ID, c.ID, 2024, 11, 150)
	paga.Status = financeiro.MensalidadePago
	v := decimal.NewFromInt(150)
	paga.ValorPago = &v
	dp := time.Now().UTC()
	paga.DataPagamento = &dp
	futura := novaMensalidade(a.ID, c.ID, 2099, 12, 150)
	require.NoError(t, mensRepo.SaveBatch(ctx, []*financeiro.Mensalidade{vencida, paga, futura}))

	rel, err := relRepo.Inadimplencia(ctx, nil, nil)
	require.NoError(t, err)

	assert.Len(t, rel.Itens, 1, "só a vencida entra no relatório")
	require.Greater(t, len(rel.Itens), 0)
	assert.Equal(t, a.ID, rel.Itens[0].AtletaID)
	assert.Greater(t, rel.Itens[0].DiasEmAtraso, 0)
	assert.True(t, rel.Itens[0].Valor.Equal(decimal.NewFromInt(150)))
}

// TestRelatorioRepository_Inadimplencia_FiltraCompetencia confirma que os
// filtros opcionais por ano e mês funcionam.
func TestRelatorioRepository_Inadimplencia_FiltraCompetencia(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	planoRepo := NewPgxPlanoRepository(pool)
	contratoRepo := NewPgxContratoRepository(pool)
	mensRepo := NewPgxMensalidadeRepository(pool)
	relRepo := NewPgxRelatorioRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))
	p := novoPlano(t, "P")
	require.NoError(t, planoRepo.Save(ctx, p))
	c, _ := financeiro.NewContrato(a.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(150))
	require.NoError(t, contratoRepo.Save(ctx, c))

	require.NoError(t, mensRepo.SaveBatch(ctx, []*financeiro.Mensalidade{
		novaMensalidade(a.ID, c.ID, 2024, 11, 150),
		novaMensalidade(a.ID, c.ID, 2024, 12, 150),
	}))

	ano, mes := 2024, 12
	rel, err := relRepo.Inadimplencia(ctx, &ano, &mes)
	require.NoError(t, err)
	require.Len(t, rel.Itens, 1)
	assert.Equal(t, 12, rel.Itens[0].CompetenciaMes)
}

// TestRelatorioRepository_FrequenciaAtleta agrega contagens de presença
// no período. Setup: 1 atleta com 3 treinos, presença = P/A/J.
func TestRelatorioRepository_FrequenciaAtleta(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	treinoRepo := NewPgxTreinoRepository(pool)
	freqRepo := NewPgxFrequenciaRepository(pool)
	relRepo := NewPgxRelatorioRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))
	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))

	// 3 treinos no mesmo mês, com presença P/A/J
	presencas := []domfreq.Presenca{
		domfreq.PresencaPresente,
		domfreq.PresencaAusente,
		domfreq.PresencaJustificado,
	}
	for i, p := range presencas {
		tr, _ := domfreq.NewTreino(tu.ID, time.Date(2026, 5, i+1, 0, 0, 0, 0, time.UTC))
		require.NoError(t, treinoRepo.Save(ctx, tr))
		require.NoError(t, freqRepo.SaveBatch(ctx, tr.ID, []*domfreq.Frequencia{
			{ID: uuid.New(), TreinoID: tr.ID, AtletaID: a.ID, Presenca: p},
		}))
	}

	di := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	df := time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC)
	r, err := relRepo.FrequenciaAtleta(ctx, a.ID, di, df)
	require.NoError(t, err)
	assert.EqualValues(t, 1, r.Presentes)
	assert.EqualValues(t, 1, r.Ausentes)
	assert.EqualValues(t, 1, r.Justificados)
	assert.EqualValues(t, 3, r.Total)
}

// TestRelatorioRepository_FrequenciaTurma agrega por atleta da turma.
// Setup: 2 atletas matriculados, 1 treino, presença P/A.
func TestRelatorioRepository_FrequenciaTurma(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	treinoRepo := NewPgxTreinoRepository(pool)
	freqRepo := NewPgxFrequenciaRepository(pool)
	relRepo := NewPgxRelatorioRepository(pool)
	ctx := context.Background()

	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))
	a1 := novoAtleta(t)
	a1.Nome = "Ana"
	require.NoError(t, atletaRepo.Save(ctx, a1))
	a2 := novoAtleta(t)
	a2.Nome = "Bruno"
	require.NoError(t, atletaRepo.Save(ctx, a2))

	tr, _ := domfreq.NewTreino(tu.ID, time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC))
	require.NoError(t, treinoRepo.Save(ctx, tr))
	require.NoError(t, freqRepo.SaveBatch(ctx, tr.ID, []*domfreq.Frequencia{
		{ID: uuid.New(), TreinoID: tr.ID, AtletaID: a1.ID, Presenca: domfreq.PresencaPresente},
		{ID: uuid.New(), TreinoID: tr.ID, AtletaID: a2.ID, Presenca: domfreq.PresencaAusente},
	}))

	di := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	df := time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC)
	r, err := relRepo.FrequenciaTurma(ctx, tu.ID, di, df)
	require.NoError(t, err)
	assert.Equal(t, tu.ID, r.TurmaID)
	assert.EqualValues(t, 1, r.TotalTreinos)
	assert.Len(t, r.Itens, 2)
}
