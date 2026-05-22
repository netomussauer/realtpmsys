//go:build integration

package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// O UsuarioRepository só tem leitura (GetByEmail, GetByID) — usuários são
// criados via migration (admin) ou via SQL direto (treinador/responsável).
// Os testes aqui validam exatamente esse caminho de leitura.

func TestUsuarioRepository_GetByEmail_FechaSeNaoExiste(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)

	got, err := repo.GetByEmail(context.Background(), "ninguem@example.com")
	require.NoError(t, err)
	assert.Nil(t, got, "not-found deve ser (nil, nil), nunca erro")
}

func TestUsuarioRepository_GetByEmail_CarregaTodosOsCampos(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)
	ctx := context.Background()

	uid := uuid.New()
	_, err := pool.Exec(ctx, `
		INSERT INTO usuarios (id, email, senha_hash, perfil, ativo)
		VALUES ($1, 'admin@test.local', 'bcrypt-hash', 'ADMIN', true)
	`, uid)
	require.NoError(t, err)

	got, err := repo.GetByEmail(ctx, "admin@test.local")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, uid, got.ID)
	assert.Equal(t, "admin@test.local", got.Email)
	assert.Equal(t, "bcrypt-hash", got.SenhaHash)
	assert.Equal(t, identidade.PerfilAdmin, got.Perfil)
	assert.True(t, got.Ativo)
}

func TestUsuarioRepository_GetByID(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)
	ctx := context.Background()

	uid := uuid.New()
	_, err := pool.Exec(ctx, `
		INSERT INTO usuarios (id, email, senha_hash, perfil, ativo)
		VALUES ($1, $2, 'h', 'RESPONSAVEL', true)
	`, uid, "resp-"+uid.String()+"@test.local")
	require.NoError(t, err)

	t.Run("encontra pelo ID", func(t *testing.T) {
		got, err := repo.GetByID(ctx, uid)
		require.NoError(t, err)
		require.NotNil(t, got)
		assert.Equal(t, identidade.PerfilResponsavel, got.Perfil)
	})

	t.Run("ID que não existe: (nil, nil)", func(t *testing.T) {
		got, err := repo.GetByID(ctx, uuid.New())
		require.NoError(t, err)
		assert.Nil(t, got)
	})
}

// TestUsuarioRepository_EmailUnique — uq_usuarios_email impede duplicatas.
// Não está no repo (que não escreve) mas vale testar a constraint do DB
// porque ela é assumida pelas queries.
func TestUsuarioRepository_EmailUnique(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	ctx := context.Background()

	_, err := pool.Exec(ctx, `
		INSERT INTO usuarios (id, email, senha_hash, perfil, ativo)
		VALUES ($1, 'mesmo@test.local', 'h', 'ADMIN', true)
	`, uuid.New())
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO usuarios (id, email, senha_hash, perfil, ativo)
		VALUES ($1, 'mesmo@test.local', 'h', 'TREINADOR', true)
	`, uuid.New())
	require.Error(t, err, "uq_usuarios_email deve rejeitar emails duplicados")
}
