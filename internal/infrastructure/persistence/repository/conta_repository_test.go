//go:build integration

package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func novoUsuarioTeste(t *testing.T, email string, perfil identidade.Perfil) *identidade.Usuario {
	t.Helper()
	u, err := identidade.NovoUsuario(email, "Nome "+email, perfil, "hash-"+email, false)
	require.NoError(t, err)
	return u
}

func TestUsuarioRepository_Save_CriaEAtualiza(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)
	ctx := context.Background()

	u := novoUsuarioTeste(t, "ana@test.local", identidade.PerfilTreinador)
	u.DeveTrocarSenha = true
	require.NoError(t, repo.Save(ctx, u))

	got, err := repo.GetByID(ctx, u.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "ana@test.local", got.Email)
	assert.Equal(t, "Nome ana@test.local", got.Nome)
	assert.Equal(t, identidade.PerfilTreinador, got.Perfil)
	assert.True(t, got.DeveTrocarSenha)

	u.Desativar()
	require.NoError(t, u.AlterarPerfil(identidade.PerfilAdmin))
	u.AlterarNome("")
	u.DefinirSenha("novo-hash", false)
	require.NoError(t, repo.Save(ctx, u))

	got, err = repo.GetByID(ctx, u.ID)
	require.NoError(t, err)
	assert.False(t, got.Ativo)
	assert.Equal(t, identidade.PerfilAdmin, got.Perfil)
	assert.Equal(t, "", got.Nome, "nome vazio vira NULL e volta como string vazia")
	assert.Equal(t, "novo-hash", got.SenhaHash)
	assert.False(t, got.DeveTrocarSenha)
}

func TestUsuarioRepository_Save_EmailDuplicado(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)
	ctx := context.Background()

	require.NoError(t, repo.Save(ctx, novoUsuarioTeste(t, "dup@test.local", identidade.PerfilAdmin)))
	err := repo.Save(ctx, novoUsuarioTeste(t, "dup@test.local", identidade.PerfilTreinador))
	assert.ErrorIs(t, err, shared.ErrEmailEmUso)
}

func TestUsuarioRepository_List_FiltrosEPaginacao(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)
	ctx := context.Background()

	ana := novoUsuarioTeste(t, "ana@test.local", identidade.PerfilTreinador)
	bia := novoUsuarioTeste(t, "bia@test.local", identidade.PerfilResponsavel)
	cadu := novoUsuarioTeste(t, "cadu@test.local", identidade.PerfilResponsavel)
	cadu.Desativar()
	for _, u := range []*identidade.Usuario{ana, bia, cadu} {
		require.NoError(t, repo.Save(ctx, u))
	}

	t.Run("sem filtro", func(t *testing.T) {
		got, total, err := repo.List(ctx, identidade.ListFilter{})
		require.NoError(t, err)
		assert.EqualValues(t, 3, total)
		assert.Len(t, got, 3)
	})
	t.Run("por perfil", func(t *testing.T) {
		p := identidade.PerfilResponsavel
		got, total, err := repo.List(ctx, identidade.ListFilter{Perfil: &p})
		require.NoError(t, err)
		assert.EqualValues(t, 2, total)
		assert.Len(t, got, 2)
	})
	t.Run("por status", func(t *testing.T) {
		inativo := false
		got, total, err := repo.List(ctx, identidade.ListFilter{Ativo: &inativo})
		require.NoError(t, err)
		assert.EqualValues(t, 1, total)
		require.Len(t, got, 1)
		assert.Equal(t, cadu.ID, got[0].ID)
	})
	t.Run("busca por e-mail ou nome", func(t *testing.T) {
		got, total, err := repo.List(ctx, identidade.ListFilter{Busca: "BIA"})
		require.NoError(t, err)
		assert.EqualValues(t, 1, total)
		require.Len(t, got, 1)
		assert.Equal(t, bia.ID, got[0].ID)
	})
	t.Run("paginação: total reflete o filtro, não a página", func(t *testing.T) {
		got, total, err := repo.List(ctx, identidade.ListFilter{Page: 2, PerPage: 2})
		require.NoError(t, err)
		assert.EqualValues(t, 3, total)
		assert.Len(t, got, 1)
	})
}

func TestUsuarioRepository_ContarAdminsAtivos(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)
	ctx := context.Background()

	a1 := novoUsuarioTeste(t, "a1@test.local", identidade.PerfilAdmin)
	a2 := novoUsuarioTeste(t, "a2@test.local", identidade.PerfilAdmin)
	a2.Desativar()
	t1 := novoUsuarioTeste(t, "t1@test.local", identidade.PerfilTreinador)
	for _, u := range []*identidade.Usuario{a1, a2, t1} {
		require.NoError(t, repo.Save(ctx, u))
	}

	n, err := repo.ContarAdminsAtivos(ctx)
	require.NoError(t, err)
	assert.EqualValues(t, 1, n, "só conta ADMIN ativo")
}

func novoRefreshTeste(usuarioID, familiaID uuid.UUID, hash string) *identidade.RefreshToken {
	return &identidade.RefreshToken{
		ID:        uuid.New(),
		UsuarioID: usuarioID,
		FamiliaID: familiaID,
		TokenHash: hash,
		ExpiraEm:  time.Now().Add(24 * time.Hour).UTC(),
		CriadoEm:  time.Now().UTC(),
	}
}

func TestRefreshTokenRepository_SaveEGetByHash(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	users := NewPgxUsuarioRepository(pool)
	repo := NewPgxRefreshTokenRepository(pool)
	ctx := context.Background()

	u := novoUsuarioTeste(t, "r@test.local", identidade.PerfilAdmin)
	require.NoError(t, users.Save(ctx, u))

	tok := novoRefreshTeste(u.ID, uuid.New(), "hash-1")
	require.NoError(t, repo.Save(ctx, tok))

	got, err := repo.GetByHash(ctx, "hash-1")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, tok.ID, got.ID)
	assert.Equal(t, tok.FamiliaID, got.FamiliaID)
	assert.Nil(t, got.RevogadoEm)

	missing, err := repo.GetByHash(ctx, "inexistente")
	require.NoError(t, err)
	assert.Nil(t, missing, "not-found deve ser (nil, nil)")
}

func TestRefreshTokenRepository_Revogacoes(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	users := NewPgxUsuarioRepository(pool)
	repo := NewPgxRefreshTokenRepository(pool)
	ctx := context.Background()

	u := novoUsuarioTeste(t, "r@test.local", identidade.PerfilAdmin)
	outro := novoUsuarioTeste(t, "o@test.local", identidade.PerfilTreinador)
	require.NoError(t, users.Save(ctx, u))
	require.NoError(t, users.Save(ctx, outro))

	famA, famB := uuid.New(), uuid.New()
	a1 := novoRefreshTeste(u.ID, famA, "a1")
	a2 := novoRefreshTeste(u.ID, famA, "a2")
	b1 := novoRefreshTeste(u.ID, famB, "b1")
	o1 := novoRefreshTeste(outro.ID, uuid.New(), "o1")
	for _, tk := range []*identidade.RefreshToken{a1, a2, b1, o1} {
		require.NoError(t, repo.Save(ctx, tk))
	}

	revogado := func(hash string) bool {
		got, err := repo.GetByHash(ctx, hash)
		require.NoError(t, err)
		require.NotNil(t, got)
		return got.RevogadoEm != nil
	}

	require.NoError(t, repo.Revogar(ctx, a1.ID))
	assert.True(t, revogado("a1"))
	assert.False(t, revogado("a2"))
	require.NoError(t, repo.Revogar(ctx, a1.ID), "revogar é idempotente")

	require.NoError(t, repo.RevogarFamilia(ctx, famA))
	assert.True(t, revogado("a2"))
	assert.False(t, revogado("b1"), "outra família não é afetada")

	require.NoError(t, repo.RevogarTodosDoUsuarioExceto(ctx, u.ID, famB))
	assert.False(t, revogado("b1"), "família poupada continua ativa")

	require.NoError(t, repo.RevogarTodosDoUsuario(ctx, u.ID))
	assert.True(t, revogado("b1"))
	assert.False(t, revogado("o1"), "tokens de outro usuário não são afetados")
}
