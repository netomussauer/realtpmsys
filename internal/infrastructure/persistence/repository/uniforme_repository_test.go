//go:build integration

package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func novoUniforme(t *testing.T, atletaID uuid.UUID, camisa string) *atleta.Uniforme {
	t.Helper()
	u, err := atleta.NewUniforme(atletaID, camisa, "14", "36")
	require.NoError(t, err)
	return u
}

func TestUniformeRepository_SaveAndGet(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	repo := NewPgxUniformeRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))

	u := novoUniforme(t, a.ID, "M")
	require.NoError(t, repo.Save(ctx, u))

	got, err := repo.GetByAtleta(ctx, a.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "M", got.TamCamisa)
	assert.Equal(t, "14", got.TamShort)
	assert.Equal(t, "36", got.TamChuteira)
}

// TestUniformeRepository_Save_Upsert valida o cenário central do repo: por
// ter constraint uq_uniformes_atleta, o Save é um upsert por atleta_id.
// Salvar 2 uniformes diferentes pro mesmo atleta sobrescreve o anterior.
func TestUniformeRepository_Save_Upsert(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	repo := NewPgxUniformeRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))

	u1 := novoUniforme(t, a.ID, "P")
	require.NoError(t, repo.Save(ctx, u1))

	// Sem upsert isso violaria uq_uniformes_atleta. Com upsert, substitui.
	require.NoError(t, u1.AtualizarTamanhos("GG", "16", "38"))
	require.NoError(t, repo.Save(ctx, u1))

	got, err := repo.GetByAtleta(ctx, a.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "GG", got.TamCamisa)
	assert.Equal(t, "16", got.TamShort)
}

func TestUniformeRepository_GetByAtleta_NaoExiste(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	repo := NewPgxUniformeRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))

	got, err := repo.GetByAtleta(ctx, a.ID)
	require.NoError(t, err)
	assert.Nil(t, got, "atleta sem uniforme: (nil, nil)")
}
