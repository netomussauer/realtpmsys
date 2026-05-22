//go:build integration

package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/turma"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestMatriculaRepository_SaveAndGet(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	matRepo := NewPgxMatriculaRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))
	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))

	m, err := turma.NewMatricula(a.ID, tu.ID, time.Now().UTC())
	require.NoError(t, err)
	require.NoError(t, matRepo.Save(ctx, m))

	got, err := matRepo.GetByID(ctx, m.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, turma.MatriculaAtiva, got.Status)
}

// TestMatriculaRepository_GetAtivaByAtletaTurma é a query usada pelo use
// case Matricular para detectar duplicidade ATIVA. Igual ao Contrato:
// cancelar e re-matricular deve ser possível.
func TestMatriculaRepository_GetAtivaByAtletaTurma(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	matRepo := NewPgxMatriculaRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))
	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))

	t.Run("sem matricula ativa: (nil, nil)", func(t *testing.T) {
		got, err := matRepo.GetAtivaByAtletaTurma(ctx, a.ID, tu.ID)
		require.NoError(t, err)
		assert.Nil(t, got)
	})

	m1, _ := turma.NewMatricula(a.ID, tu.ID, time.Now().UTC())
	require.NoError(t, matRepo.Save(ctx, m1))

	t.Run("com matricula ATIVA: devolve", func(t *testing.T) {
		got, err := matRepo.GetAtivaByAtletaTurma(ctx, a.ID, tu.ID)
		require.NoError(t, err)
		require.NotNil(t, got)
		assert.Equal(t, m1.ID, got.ID)
	})

	t.Run("após cancelar: volta a (nil, nil)", func(t *testing.T) {
		require.NoError(t, m1.Cancelar())
		require.NoError(t, matRepo.Save(ctx, m1))

		got, err := matRepo.GetAtivaByAtletaTurma(ctx, a.ID, tu.ID)
		require.NoError(t, err)
		assert.Nil(t, got, "matricula cancelada não é ATIVA")
	})
}

// TestMatriculaRepository_UniqueAtivaPorTurma — uq_matricula_ativa_por_turma
// impede 2 matrículas ATIVAS do mesmo atleta na mesma turma.
func TestMatriculaRepository_UniqueAtivaPorTurma(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	matRepo := NewPgxMatriculaRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))
	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))

	m1, _ := turma.NewMatricula(a.ID, tu.ID, time.Now().UTC())
	require.NoError(t, matRepo.Save(ctx, m1))

	m2, _ := turma.NewMatricula(a.ID, tu.ID, time.Now().UTC())
	err := matRepo.Save(ctx, m2)
	require.Error(t, err, "DB deve rejeitar 2 matrículas ATIVAS no mesmo atleta+turma")
}

func TestMatriculaRepository_CountAtivasPorTurma(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	matRepo := NewPgxMatriculaRepository(pool)
	ctx := context.Background()

	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))

	// 2 atletas matriculados ATIVOS + 1 cancelado
	for i := 0; i < 3; i++ {
		a := novoAtleta(t)
		require.NoError(t, atletaRepo.Save(ctx, a))
		m, _ := turma.NewMatricula(a.ID, tu.ID, time.Now().UTC())
		if i == 2 {
			require.NoError(t, m.Cancelar())
		}
		require.NoError(t, matRepo.Save(ctx, m))
	}

	n, err := matRepo.CountAtivasPorTurma(ctx, tu.ID)
	require.NoError(t, err)
	assert.EqualValues(t, 2, n, "count deve ignorar canceladas")
}

var _ = uuid.New
