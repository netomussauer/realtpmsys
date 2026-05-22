//go:build integration

package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	domfreq "github.com/realtpmsys/realtpmsys/internal/domain/frequencia"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestTreinoRepository_SaveAndGet(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	treinoRepo := NewPgxTreinoRepository(pool)
	ctx := context.Background()

	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))

	tr, err := domfreq.NewTreino(tu.ID, time.Date(2026, 5, 22, 0, 0, 0, 0, time.UTC))
	require.NoError(t, err)
	require.NoError(t, treinoRepo.Save(ctx, tr))

	got, err := treinoRepo.GetByID(ctx, tr.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, tu.ID, got.TurmaID)
}

// TestTreinoRepository_GetByTurmaData é a query usada pelo use case
// CriarTreino para detectar duplicidade. Cobre o sentinela: turma+data
// que existe → retorna entidade; que não existe → (nil, nil).
func TestTreinoRepository_GetByTurmaData(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	treinoRepo := NewPgxTreinoRepository(pool)
	ctx := context.Background()

	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))

	data := time.Date(2026, 5, 22, 0, 0, 0, 0, time.UTC)
	tr, _ := domfreq.NewTreino(tu.ID, data)
	require.NoError(t, treinoRepo.Save(ctx, tr))

	t.Run("turma+data existente", func(t *testing.T) {
		got, err := treinoRepo.GetByTurmaData(ctx, tu.ID, data)
		require.NoError(t, err)
		require.NotNil(t, got)
		assert.Equal(t, tr.ID, got.ID)
	})

	t.Run("turma certa, data diferente: (nil, nil)", func(t *testing.T) {
		got, err := treinoRepo.GetByTurmaData(ctx, tu.ID, data.AddDate(0, 0, 1))
		require.NoError(t, err)
		assert.Nil(t, got)
	})
}

// TestTreinoRepository_UniqueTurmaData — uq_treino_turma_data impede 2
// treinos na mesma turma na mesma data. Garantia básica de domínio.
func TestTreinoRepository_UniqueTurmaData(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	treinoRepo := NewPgxTreinoRepository(pool)
	ctx := context.Background()

	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))

	data := time.Date(2026, 5, 22, 0, 0, 0, 0, time.UTC)
	tr1, _ := domfreq.NewTreino(tu.ID, data)
	require.NoError(t, treinoRepo.Save(ctx, tr1))

	tr2, _ := domfreq.NewTreino(tu.ID, data)
	err := treinoRepo.Save(ctx, tr2)
	require.Error(t, err, "DB deve rejeitar 2 treinos na mesma turma+data")
}

func TestTreinoRepository_ListPorTurma_FiltraPorPeriodo(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	treinoRepo := NewPgxTreinoRepository(pool)
	ctx := context.Background()

	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))

	for _, d := range []time.Time{
		time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC),
		time.Date(2026, 5, 15, 0, 0, 0, 0, time.UTC),
		time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC),
	} {
		tr, _ := domfreq.NewTreino(tu.ID, d)
		require.NoError(t, treinoRepo.Save(ctx, tr))
	}

	di := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	df := time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC)
	rows, total, err := treinoRepo.ListPorTurma(ctx, tu.ID, domfreq.TreinoListFilter{
		DataInicio: &di, DataFim: &df, Page: 1, PerPage: 20,
	})
	require.NoError(t, err)
	assert.EqualValues(t, 2, total, "só os 2 treinos de maio dentro da janela")
	assert.Len(t, rows, 2)
}

var _ = uuid.New
