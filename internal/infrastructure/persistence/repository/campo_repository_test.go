//go:build integration

package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/campo"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func novoCampo(t *testing.T, nome string) *campo.Campo {
	t.Helper()
	c, err := campo.New(nome, nil)
	require.NoError(t, err)
	return c
}

func TestCampoRepository_SaveAndGet(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxCampoRepository(pool)
	ctx := context.Background()

	c := novoCampo(t, "Campo Central")
	require.NoError(t, repo.Save(ctx, c))

	got, err := repo.GetByID(ctx, c.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "Campo Central", got.Nome)
	assert.True(t, got.Ativo)
}

func TestCampoRepository_GetByID_NaoExiste(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxCampoRepository(pool)

	got, err := repo.GetByID(context.Background(), uuid.New())
	require.NoError(t, err)
	assert.Nil(t, got)
}

func TestCampoRepository_Save_AtualizaToggleAtivo(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxCampoRepository(pool)
	ctx := context.Background()

	c := novoCampo(t, "Campo Norte")
	require.NoError(t, repo.Save(ctx, c))

	c.Inativar()
	require.NoError(t, repo.Save(ctx, c))

	got, err := repo.GetByID(ctx, c.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.False(t, got.Ativo, "Save deve persistir o toggle")
}

func TestCampoRepository_List_FiltraAtivo(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxCampoRepository(pool)
	ctx := context.Background()

	c1 := novoCampo(t, "Campo A")
	require.NoError(t, repo.Save(ctx, c1))
	c2 := novoCampo(t, "Campo B")
	c2.Inativar()
	require.NoError(t, repo.Save(ctx, c2))

	tr := true
	rows, total, err := repo.List(ctx, campo.ListFilter{Ativo: &tr})
	require.NoError(t, err)
	assert.EqualValues(t, 1, total)
	require.Len(t, rows, 1)
	assert.Equal(t, "Campo A", rows[0].Nome)
}
