//go:build integration

package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestContratoRepository_SaveAndGet(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	planoRepo := NewPgxPlanoRepository(pool)
	contratoRepo := NewPgxContratoRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))
	p := novoPlano(t, "P")
	require.NoError(t, planoRepo.Save(ctx, p))

	c, err := financeiro.NewContrato(a.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(180))
	require.NoError(t, err)
	require.NoError(t, contratoRepo.Save(ctx, c))

	got, err := contratoRepo.GetByID(ctx, c.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, financeiro.ContratoAtivo, got.Status)
	assert.True(t, got.ValorContratado.Equal(decimal.NewFromInt(180)))
}

// TestContratoRepository_GetAtivoPorAtleta_FiltraStatus é o cenário central:
// o repo só pode devolver contratos com status='ATIVO'. Se outro estiver
// cancelado/encerrado, deve retornar nil — não pode retornar o cancelado.
func TestContratoRepository_GetAtivoPorAtleta_FiltraStatus(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	planoRepo := NewPgxPlanoRepository(pool)
	contratoRepo := NewPgxContratoRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))
	p := novoPlano(t, "P")
	require.NoError(t, planoRepo.Save(ctx, p))

	// Cria contrato CANCELADO primeiro
	cancelado, err := financeiro.NewContrato(a.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(150))
	require.NoError(t, err)
	require.NoError(t, cancelado.Cancelar())
	require.NoError(t, contratoRepo.Save(ctx, cancelado))

	t.Run("sem contrato ativo: (nil, nil)", func(t *testing.T) {
		got, err := contratoRepo.GetAtivoPorAtleta(ctx, a.ID)
		require.NoError(t, err)
		assert.Nil(t, got, "GetAtivoPorAtleta não pode devolver contrato cancelado")
	})

	// Agora cria um ATIVO no mesmo atleta
	ativo, err := financeiro.NewContrato(a.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(200))
	require.NoError(t, err)
	require.NoError(t, contratoRepo.Save(ctx, ativo))

	t.Run("com contrato ativo: devolve o ATIVO", func(t *testing.T) {
		got, err := contratoRepo.GetAtivoPorAtleta(ctx, a.ID)
		require.NoError(t, err)
		require.NotNil(t, got)
		assert.Equal(t, ativo.ID, got.ID)
		assert.Equal(t, financeiro.ContratoAtivo, got.Status)
	})
}

// TestContratoRepository_UniqueAtivoPorAtleta valida que o índice parcial
// `uq_contrato_ativo_por_atleta` impede 2 contratos ATIVOS no mesmo atleta.
func TestContratoRepository_UniqueAtivoPorAtleta(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	planoRepo := NewPgxPlanoRepository(pool)
	contratoRepo := NewPgxContratoRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))
	p := novoPlano(t, "P")
	require.NoError(t, planoRepo.Save(ctx, p))

	c1, _ := financeiro.NewContrato(a.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(150))
	require.NoError(t, contratoRepo.Save(ctx, c1))

	c2, _ := financeiro.NewContrato(a.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(160))
	err := contratoRepo.Save(ctx, c2)
	require.Error(t, err, "DB deve rejeitar 2o contrato ATIVO no mesmo atleta")
}

func TestContratoRepository_ListAtivos(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	planoRepo := NewPgxPlanoRepository(pool)
	contratoRepo := NewPgxContratoRepository(pool)
	ctx := context.Background()

	// 2 atletas distintos com 2 contratos ATIVOS
	a1 := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a1))
	a2 := novoAtleta(t)
	a2.Nome = "Outro"
	require.NoError(t, atletaRepo.Save(ctx, a2))

	p := novoPlano(t, "P")
	require.NoError(t, planoRepo.Save(ctx, p))

	c1, _ := financeiro.NewContrato(a1.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(150))
	require.NoError(t, contratoRepo.Save(ctx, c1))
	c2, _ := financeiro.NewContrato(a2.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(160))
	require.NoError(t, contratoRepo.Save(ctx, c2))

	// 1 cancelado num 3o atleta — não pode aparecer
	a3 := novoAtleta(t)
	a3.Nome = "Inativo"
	require.NoError(t, atletaRepo.Save(ctx, a3))
	c3, _ := financeiro.NewContrato(a3.ID, p.ID, time.Now().Add(-24*time.Hour).UTC(), decimal.NewFromInt(170))
	require.NoError(t, c3.Cancelar())
	require.NoError(t, contratoRepo.Save(ctx, c3))

	rows, err := contratoRepo.ListAtivos(ctx)
	require.NoError(t, err)
	assert.Len(t, rows, 2)
	for _, c := range rows {
		assert.Equal(t, financeiro.ContratoAtivo, c.Status)
	}
}

// silence import quando uuid não é usado num test específico
var _ = uuid.New
