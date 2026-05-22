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

// fixtureTreino monta o pré-requisito mínimo para frequências:
// turma criada (Save em tx) e treino registrado.
func fixtureTreino(t *testing.T, turmaRepo *PgxTurmaRepository, treinoRepo *PgxTreinoRepository) (turmaID, treinoID uuid.UUID) {
	t.Helper()
	ctx := context.Background()

	tu := novaTurma(t)
	require.NoError(t, turmaRepo.Save(ctx, tu))

	tr, err := domfreq.NewTreino(tu.ID, time.Date(2026, 5, 22, 0, 0, 0, 0, time.UTC))
	require.NoError(t, err)
	require.NoError(t, treinoRepo.Save(ctx, tr))

	return tu.ID, tr.ID
}

func TestFrequenciaRepository_SaveBatch_Idempotente(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	treinoRepo := NewPgxTreinoRepository(pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	freqRepo := NewPgxFrequenciaRepository(pool)
	ctx := context.Background()

	_, treinoID := fixtureTreino(t, turmaRepo, treinoRepo)

	// Cria 2 atletas para receberem presença
	a1 := novoAtleta(t)
	a1.Nome = "Atleta 1"
	require.NoError(t, atletaRepo.Save(ctx, a1))
	a2 := novoAtleta(t)
	a2.Nome = "Atleta 2"
	require.NoError(t, atletaRepo.Save(ctx, a2))

	lote := []*domfreq.Frequencia{
		{ID: uuid.New(), TreinoID: treinoID, AtletaID: a1.ID, Presenca: domfreq.PresencaPresente},
		{ID: uuid.New(), TreinoID: treinoID, AtletaID: a2.ID, Presenca: domfreq.PresencaAusente},
	}
	require.NoError(t, freqRepo.SaveBatch(ctx, treinoID, lote))

	rows, err := freqRepo.ListPorTreino(ctx, treinoID)
	require.NoError(t, err)
	require.Len(t, rows, 2)

	t.Run("re-rodar o mesmo lote: idempotente (sem duplicar)", func(t *testing.T) {
		require.NoError(t, freqRepo.SaveBatch(ctx, treinoID, lote))
		rows, err := freqRepo.ListPorTreino(ctx, treinoID)
		require.NoError(t, err)
		assert.Len(t, rows, 2, "upsert por (treino_id, atleta_id) — nada duplica")
	})

	t.Run("alterar presença do A2 + adicionar justificativa: upsert atualiza", func(t *testing.T) {
		j := "atestado médico"
		loteAtualizado := []*domfreq.Frequencia{
			{ID: lote[0].ID, TreinoID: treinoID, AtletaID: a1.ID, Presenca: domfreq.PresencaPresente},
			{ID: lote[1].ID, TreinoID: treinoID, AtletaID: a2.ID, Presenca: domfreq.PresencaJustificado, Justificativa: &j},
		}
		require.NoError(t, freqRepo.SaveBatch(ctx, treinoID, loteAtualizado))

		rows, err := freqRepo.ListPorTreino(ctx, treinoID)
		require.NoError(t, err)
		require.Len(t, rows, 2)

		for _, r := range rows {
			if r.AtletaID == a2.ID {
				assert.Equal(t, domfreq.PresencaJustificado, r.Presenca)
				require.NotNil(t, r.Justificativa)
				assert.Equal(t, "atestado médico", *r.Justificativa)
			}
		}
	})
}

func TestFrequenciaRepository_SaveBatch_ValidaCoerencia(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	turmaRepo := NewPgxTurmaRepository(pool)
	treinoRepo := NewPgxTreinoRepository(pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	freqRepo := NewPgxFrequenciaRepository(pool)
	ctx := context.Background()

	_, treinoID := fixtureTreino(t, turmaRepo, treinoRepo)
	outroTreinoID := uuid.New()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))

	// Frequência com TreinoID errado dentro do batch — repo deve recusar.
	lote := []*domfreq.Frequencia{
		{ID: uuid.New(), TreinoID: outroTreinoID, AtletaID: a.ID, Presenca: domfreq.PresencaPresente},
	}
	err := freqRepo.SaveBatch(ctx, treinoID, lote)
	require.Error(t, err, "treino_id divergente do batch_id deve ser rejeitado")
}

func TestFrequenciaRepository_SaveBatch_VazioNaoFalha(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	freqRepo := NewPgxFrequenciaRepository(pool)

	// nil + slice vazio: ambos devem ser no-op
	require.NoError(t, freqRepo.SaveBatch(context.Background(), uuid.New(), nil))
	require.NoError(t, freqRepo.SaveBatch(context.Background(), uuid.New(), []*domfreq.Frequencia{}))
}
