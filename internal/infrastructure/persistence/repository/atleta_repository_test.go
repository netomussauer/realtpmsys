//go:build integration

package repository

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// novoAtleta cria um atleta de fixture pronto para Save — preenche os campos
// não-nulos do schema com valores válidos. Os subtests podem mutar o retorno
// antes de chamar Save quando precisarem testar outros valores.
func novoAtleta(t *testing.T) *atleta.Atleta {
	t.Helper()
	a, err := atleta.New("João Silva", time.Date(2014, 3, 15, 0, 0, 0, 0, time.UTC))
	require.NoError(t, err)
	return a
}

func TestAtletaRepository_SaveAndGet(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxAtletaRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, repo.Save(ctx, a))

	got, err := repo.GetByID(ctx, a.ID)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, a.ID, got.ID)
	assert.Equal(t, "João Silva", got.Nome)
	assert.Equal(t, atleta.StatusAtivo, got.Status)
}

func TestAtletaRepository_GetByID_NaoExiste(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxAtletaRepository(pool)

	got, err := repo.GetByID(context.Background(), uuid.New())
	require.NoError(t, err, "GetByID deve devolver (nil, nil) para not-found, não erro")
	assert.Nil(t, got)
}

func TestAtletaRepository_GetByCPF(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxAtletaRepository(pool)
	ctx := context.Background()

	cpf := "12345678901"
	a := novoAtleta(t)
	require.NoError(t, a.SetCPF(cpf))
	require.NoError(t, repo.Save(ctx, a))

	got, err := repo.GetByCPF(ctx, cpf)
	require.NoError(t, err)
	require.NotNil(t, got)
	assert.Equal(t, a.ID, got.ID)

	got, err = repo.GetByCPF(ctx, "99999999999")
	require.NoError(t, err)
	assert.Nil(t, got)
}

func TestAtletaRepository_List_FiltraPorNomeEStatus(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxAtletaRepository(pool)
	ctx := context.Background()

	a1 := novoAtleta(t)
	a1.Nome = "Ana Pereira"
	require.NoError(t, repo.Save(ctx, a1))

	a2 := novoAtleta(t)
	a2.Nome = "Bruno Costa"
	require.NoError(t, repo.Save(ctx, a2))

	a3 := novoAtleta(t)
	a3.Nome = "Carlos Suspenso"
	require.NoError(t, a3.Suspender())
	require.NoError(t, repo.Save(ctx, a3))

	t.Run("sem filtros — lista todos", func(t *testing.T) {
		rows, total, err := repo.List(ctx, atleta.ListFilter{})
		require.NoError(t, err)
		assert.EqualValues(t, 3, total)
		assert.Len(t, rows, 3)
	})

	t.Run("filtro por nome parcial", func(t *testing.T) {
		rows, total, err := repo.List(ctx, atleta.ListFilter{Nome: "Ana"})
		require.NoError(t, err)
		assert.EqualValues(t, 1, total)
		require.Len(t, rows, 1)
		assert.Equal(t, "Ana Pereira", rows[0].Nome)
	})

	t.Run("filtro por status SUSPENSO", func(t *testing.T) {
		st := atleta.StatusSuspenso
		rows, total, err := repo.List(ctx, atleta.ListFilter{Status: &st})
		require.NoError(t, err)
		assert.EqualValues(t, 1, total)
		require.Len(t, rows, 1)
		assert.Equal(t, "Carlos Suspenso", rows[0].Nome)
	})
}

func TestAtletaRepository_SoftDelete_OcultaEmList(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxAtletaRepository(pool)
	ctx := context.Background()

	a := novoAtleta(t)
	require.NoError(t, repo.Save(ctx, a))

	require.NoError(t, repo.SoftDelete(ctx, a.ID))

	got, err := repo.GetByID(ctx, a.ID)
	require.NoError(t, err)
	assert.Nil(t, got, "GetByID deve ignorar atletas soft-deleted")

	_, total, err := repo.List(ctx, atleta.ListFilter{})
	require.NoError(t, err)
	assert.EqualValues(t, 0, total)
}

// ─────────────────────────────────────────────────────────────────────────────
// Filtros do perfil RESPONSAVEL (commit 2d55ed6)
// ─────────────────────────────────────────────────────────────────────────────

func TestAtletaRepository_GetByIDPorResponsavel(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxAtletaRepository(pool)
	ctx := context.Background()

	// Cria um usuário responsável "fake" — não passa pela interface, vai
	// direto no SQL para evitar dependência cruzada com UsuarioRepository.
	respUserID := uuid.New()
	_, err := pool.Exec(ctx, `
		INSERT INTO usuarios (id, email, senha_hash, perfil, ativo)
		VALUES ($1, $2, 'x', 'RESPONSAVEL', true)
	`, respUserID, "resp-"+respUserID.String()+"@test.local")
	require.NoError(t, err)

	atletaDoResp := novoAtleta(t)
	atletaDoResp.UsuarioResponsavelID = &respUserID
	require.NoError(t, repo.Save(ctx, atletaDoResp))

	atletaAlheio := novoAtleta(t)
	atletaAlheio.Nome = "Pertence a Outro"
	require.NoError(t, repo.Save(ctx, atletaAlheio))

	t.Run("vê seu filho", func(t *testing.T) {
		got, err := repo.GetByIDPorResponsavel(ctx, atletaDoResp.ID, respUserID)
		require.NoError(t, err)
		require.NotNil(t, got)
		assert.Equal(t, atletaDoResp.ID, got.ID)
	})

	t.Run("atleta alheio: (nil, nil), nunca erro", func(t *testing.T) {
		got, err := repo.GetByIDPorResponsavel(ctx, atletaAlheio.ID, respUserID)
		require.NoError(t, err)
		assert.Nil(t, got, "vazamento de enumeração não pode acontecer aqui")
	})

	t.Run("usuário responsável que não existe: (nil, nil)", func(t *testing.T) {
		got, err := repo.GetByIDPorResponsavel(ctx, atletaDoResp.ID, uuid.New())
		require.NoError(t, err)
		assert.Nil(t, got)
	})
}

func TestAtletaRepository_IsAtletaDoResponsavel(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxAtletaRepository(pool)
	ctx := context.Background()

	respUserID := uuid.New()
	_, err := pool.Exec(ctx, `
		INSERT INTO usuarios (id, email, senha_hash, perfil, ativo)
		VALUES ($1, $2, 'x', 'RESPONSAVEL', true)
	`, respUserID, "resp-"+respUserID.String()+"@test.local")
	require.NoError(t, err)

	atletaDoResp := novoAtleta(t)
	atletaDoResp.UsuarioResponsavelID = &respUserID
	require.NoError(t, repo.Save(ctx, atletaDoResp))

	atletaAlheio := novoAtleta(t)
	require.NoError(t, repo.Save(ctx, atletaAlheio))

	cases := []struct {
		name    string
		atID    uuid.UUID
		respID  uuid.UUID
		want    bool
	}{
		{"é do responsável", atletaDoResp.ID, respUserID, true},
		{"não é do responsável", atletaAlheio.ID, respUserID, false},
		{"atleta inexistente", uuid.New(), respUserID, false},
		{"responsável inexistente", atletaDoResp.ID, uuid.New(), false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			ok, err := repo.IsAtletaDoResponsavel(ctx, tc.atID, tc.respID)
			require.NoError(t, err)
			assert.Equal(t, tc.want, ok)
		})
	}
}
