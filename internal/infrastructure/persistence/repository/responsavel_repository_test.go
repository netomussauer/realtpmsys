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

// novoResponsavel cria um responsável de fixture vinculado ao atleta dado.
func novoResponsavel(t *testing.T, atletaID uuid.UUID) *atleta.Responsavel {
	t.Helper()
	r, err := atleta.NewResponsavel(atletaID, "Maria Silva", "11999990000", atleta.ParentescoMae)
	require.NoError(t, err)
	return r
}

// TestResponsavelRepository_SaveBasico cobre o caminho simples: insere e busca.
func TestResponsavelRepository_SaveBasico(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	respRepo := NewPgxResponsavelRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))

	r := novoResponsavel(t, a.ID)
	require.NoError(t, respRepo.SaveWithPrincipalSwap(ctx, r))

	got, err := respRepo.GetByID(ctx, r.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "Maria Silva", got.Nome)
	assert.False(t, got.ContatoPrincipal, "default contato_principal=false quando não informado")
}

// TestResponsavelRepository_SwapPrincipal_TransacaoAtomica
// é o cenário crítico: ao salvar um novo principal, o anterior é despromovido
// na MESMA transação para não violar uq_responsavel_principal_por_atleta.
func TestResponsavelRepository_SwapPrincipal_TransacaoAtomica(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	respRepo := NewPgxResponsavelRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))

	// 1º principal — Maria (mãe)
	mae := novoResponsavel(t, a.ID)
	mae.Nome = "Maria"
	mae.MarcarComoPrincipal()
	require.NoError(t, respRepo.SaveWithPrincipalSwap(ctx, mae))

	principal, err := respRepo.GetPrincipalDoAtleta(ctx, a.ID)
	require.NoError(t, err)
	require.NotNil(t, principal)
	assert.Equal(t, mae.ID, principal.ID, "primeira inserção principal deve constar")

	// 2º responsável — Pai vira principal: Maria deve ser despromovida na mesma tx
	pai, err := atleta.NewResponsavel(a.ID, "José", "11988887777", atleta.ParentescoPai)
	require.NoError(t, err)
	pai.MarcarComoPrincipal()
	require.NoError(t, respRepo.SaveWithPrincipalSwap(ctx, pai),
		"sem swap atômico, o unique index parcial violaria")

	t.Run("Pai é o novo principal", func(t *testing.T) {
		principal, err := respRepo.GetPrincipalDoAtleta(ctx, a.ID)
		require.NoError(t, err)
		require.NotNil(t, principal)
		assert.Equal(t, pai.ID, principal.ID)
	})

	t.Run("Mãe permanece registrada, sem flag de principal", func(t *testing.T) {
		got, err := respRepo.GetByID(ctx, mae.ID)
		require.NoError(t, err)
		require.NotNil(t, got)
		assert.False(t, got.ContatoPrincipal, "Mãe foi despromovida na mesma tx")
	})

	t.Run("ListByAtleta devolve ambos (Mãe + Pai)", func(t *testing.T) {
		all, err := respRepo.ListByAtleta(ctx, a.ID)
		require.NoError(t, err)
		assert.Len(t, all, 2)
	})
}

func TestResponsavelRepository_Delete(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	atletaRepo := NewPgxAtletaRepository(pool)
	respRepo := NewPgxResponsavelRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, atletaRepo.Save(ctx, a))

	r := novoResponsavel(t, a.ID)
	require.NoError(t, respRepo.SaveWithPrincipalSwap(ctx, r))

	require.NoError(t, respRepo.Delete(ctx, r.ID))

	got, err := respRepo.GetByID(ctx, r.ID)
	require.NoError(t, err)
	assert.Nil(t, got)
}
