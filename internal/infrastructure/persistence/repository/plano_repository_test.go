//go:build integration

package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func novoPlano(t *testing.T, nome string) *financeiro.Plano {
	t.Helper()
	p, err := financeiro.NewPlano(nome, 3, decimal.NewFromInt(150), 10)
	require.NoError(t, err)
	return p
}

func TestPlanoRepository_SaveAndGet(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxPlanoRepository(pool)
	ctx := context.Background()

	p := novoPlano(t, "Mensal 3x")
	require.NoError(t, repo.Save(ctx, p))

	got, err := repo.GetByID(ctx, p.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "Mensal 3x", got.Nome)
	assert.True(t, got.Ativo)
	assert.True(t, got.ValorMensal.Equal(decimal.NewFromInt(150)))
}

func TestPlanoRepository_GetByID_NaoExiste(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxPlanoRepository(pool)

	got, err := repo.GetByID(context.Background(), uuid.New())
	require.NoError(t, err)
	assert.Nil(t, got)
}

func TestPlanoRepository_ListAtivos_FiltraInativos(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxPlanoRepository(pool)
	ctx := context.Background()

	ativo := novoPlano(t, "Plano A")
	require.NoError(t, repo.Save(ctx, ativo))

	inativo := novoPlano(t, "Plano B")
	inativo.Ativo = false
	require.NoError(t, repo.Save(ctx, inativo))

	rows, err := repo.ListAtivos(ctx)
	require.NoError(t, err)
	assert.Len(t, rows, 1, "ListAtivos não pode retornar planos desativados")
	assert.Equal(t, "Plano A", rows[0].Nome)
}
