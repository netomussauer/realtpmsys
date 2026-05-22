//go:build integration

package repository

import (
	"context"
	"testing"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/realtpmsys/realtpmsys/internal/domain/treinador"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// criaUsuarioFake insere um usuario direto via SQL para satisfazer a FK
// treinadores.usuario_id sem depender do UsuarioRepository (que só lê).
func criaUsuarioFake(t *testing.T, pool *pgxpool.Pool, perfil string) uuid.UUID {
	t.Helper()
	id := uuid.New()
	_, err := pool.Exec(context.Background(), `
		INSERT INTO usuarios (id, email, senha_hash, perfil, ativo)
		VALUES ($1, $2, 'x', $3, true)
	`, id, "u-"+id.String()+"@test.local", perfil)
	require.NoError(t, err)
	return id
}

func novoTreinador(t *testing.T, usuarioID uuid.UUID, nome string) *treinador.Treinador {
	t.Helper()
	tr, err := treinador.New(usuarioID, nome)
	require.NoError(t, err)
	return tr
}

func TestTreinadorRepository_SaveAndGet(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxTreinadorRepository(pool)
	ctx := context.Background()

	uid := criaUsuarioFake(t, pool, "TREINADOR")
	tr := novoTreinador(t, uid, "Carlos")
	require.NoError(t, repo.Save(ctx, tr))

	got, err := repo.GetByID(ctx, tr.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, "Carlos", got.Nome)
	assert.Equal(t, uid, got.UsuarioID)
}

func TestTreinadorRepository_GetByUsuarioID(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxTreinadorRepository(pool)
	ctx := context.Background()

	uid := criaUsuarioFake(t, pool, "TREINADOR")
	tr := novoTreinador(t, uid, "Carlos")
	require.NoError(t, repo.Save(ctx, tr))

	got, err := repo.GetByUsuarioID(ctx, uid)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, tr.ID, got.ID)

	none, err := repo.GetByUsuarioID(ctx, uuid.New())
	require.NoError(t, err)
	assert.Nil(t, none)
}

func TestTreinadorRepository_GetByCPF(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxTreinadorRepository(pool)
	ctx := context.Background()

	uid := criaUsuarioFake(t, pool, "TREINADOR")
	tr := novoTreinador(t, uid, "Carlos")
	require.NoError(t, tr.SetCPF("12345678901"))
	require.NoError(t, repo.Save(ctx, tr))

	got, err := repo.GetByCPF(ctx, "12345678901")
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, tr.ID, got.ID)
}

// TestTreinadorRepository_UniqueUsuarioID — uq_treinadores_usuario impede
// dois Treinadores apontarem para o mesmo Usuario.
func TestTreinadorRepository_UniqueUsuarioID(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxTreinadorRepository(pool)
	ctx := context.Background()

	uid := criaUsuarioFake(t, pool, "TREINADOR")
	tr1 := novoTreinador(t, uid, "Carlos")
	require.NoError(t, repo.Save(ctx, tr1))

	tr2 := novoTreinador(t, uid, "Outro Nome")
	err := repo.Save(ctx, tr2)
	require.Error(t, err, "DB deve rejeitar 2 treinadores no mesmo usuario_id")
}

func TestTreinadorRepository_SoftDelete(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxTreinadorRepository(pool)
	ctx := context.Background()

	uid := criaUsuarioFake(t, pool, "TREINADOR")
	tr := novoTreinador(t, uid, "Carlos")
	require.NoError(t, repo.Save(ctx, tr))

	require.NoError(t, repo.SoftDelete(ctx, tr.ID))

	got, err := repo.GetByID(ctx, tr.ID)
	require.NoError(t, err)
	assert.Nil(t, got, "GetByID deve ocultar soft-deleted")
}
