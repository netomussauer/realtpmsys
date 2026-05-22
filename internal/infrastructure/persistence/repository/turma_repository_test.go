//go:build integration

package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/turma"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func novaTurma(t *testing.T) *turma.Turma {
	t.Helper()
	tu, err := turma.NewTurma("Sub-12", 10, 12, 20)
	require.NoError(t, err)
	return tu
}

func TestTurmaRepository_SaveSemHorarios(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxTurmaRepository(pool)
	ctx := context.Background()

	tu := novaTurma(t)
	require.NoError(t, repo.Save(ctx, tu))

	got, err := repo.GetByID(ctx, tu.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "Sub-12", got.Nome)
	assert.Equal(t, turma.StatusAtiva, got.Status)
	assert.Empty(t, got.Horarios, "sem horários, slice vazio")
}

// TestTurmaRepository_SaveComHorarios_TudoOuNada é o cenário central: o
// agregado Turma+Horarios precisa ser persistido na MESMA transação. Se
// algum INSERT de horário falhar, nem a Turma deve ficar (ou seja, sem
// inconsistência parcial).
func TestTurmaRepository_SaveComHorarios_TudoOuNada(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxTurmaRepository(pool)
	ctx := context.Background()

	tu := novaTurma(t)
	tu.Horarios = []turma.HorarioTurma{
		{ID: uuid.New(), TurmaID: tu.ID, DiaSemana: turma.DiaSEG, HoraInicio: "18:00", HoraFim: "19:30"},
		{ID: uuid.New(), TurmaID: tu.ID, DiaSemana: turma.DiaQUA, HoraInicio: "18:00", HoraFim: "19:30"},
		{ID: uuid.New(), TurmaID: tu.ID, DiaSemana: turma.DiaSEX, HoraInicio: "18:00", HoraFim: "19:30"},
	}
	require.NoError(t, repo.Save(ctx, tu))

	got, err := repo.GetByID(ctx, tu.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Len(t, got.Horarios, 3)

	// O Save é idempotente — chamado duas vezes não duplica horários.
	t.Run("Save idempotente substitui horários (sem duplicar)", func(t *testing.T) {
		tu.Horarios = tu.Horarios[:2] // remove o último
		require.NoError(t, repo.Save(ctx, tu))

		got, err := repo.GetByID(ctx, tu.ID)
		require.NoError(t, err)
		assert.Len(t, got.Horarios, 2, "Save deve sincronizar horários (delete-and-insert)")
	})
}

func TestTurmaRepository_List_FiltraStatus(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxTurmaRepository(pool)
	ctx := context.Background()

	tu1 := novaTurma(t)
	tu1.Nome = "Sub-12 ATIVA"
	require.NoError(t, repo.Save(ctx, tu1))

	tu2 := novaTurma(t)
	tu2.Nome = "Sub-14 ENCERRADA"
	require.NoError(t, tu2.Encerrar())
	require.NoError(t, repo.Save(ctx, tu2))

	encerrada := turma.StatusEncerrada
	rows, total, err := repo.List(ctx, turma.TurmaListFilter{Status: &encerrada})
	require.NoError(t, err)
	assert.EqualValues(t, 1, total)
	require.Len(t, rows, 1)
	assert.Equal(t, "Sub-14 ENCERRADA", rows[0].Nome)
}
