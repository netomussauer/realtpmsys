//go:build integration

package repository

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
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

func TestUsuarioRepository_Modificar_AplicaAlteracaoEContaAdminsNaTransacao(t *testing.T) {
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

	var admins int64
	got, err := repo.Modificar(ctx, t1.ID, func(ctx context.Context, u *identidade.Usuario, tx identidade.ContaTx) error {
		var err error
		admins, err = tx.ContarAdminsAtivos(ctx)
		u.AlterarNome("Novo Nome")
		return err
	})
	require.NoError(t, err)
	assert.EqualValues(t, 1, admins, "só conta ADMIN ativo")
	assert.Equal(t, "Novo Nome", got.Nome)

	persistido, err := repo.GetByID(ctx, t1.ID)
	require.NoError(t, err)
	assert.Equal(t, "Novo Nome", persistido.Nome)
}

func TestUsuarioRepository_Modificar_ErroNoCallbackFazRollback(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)
	tokens := NewPgxRefreshTokenRepository(pool)
	ctx := context.Background()

	u := novoUsuarioTeste(t, "r@test.local", identidade.PerfilTreinador)
	require.NoError(t, repo.Save(ctx, u))
	require.NoError(t, tokens.Save(ctx, novoRefreshTeste(u.ID, uuid.New(), "h-rollback")))

	boom := errors.New("falha de negócio")
	_, err := repo.Modificar(ctx, u.ID, func(ctx context.Context, x *identidade.Usuario, tx identidade.ContaTx) error {
		x.Desativar()
		require.NoError(t, tx.RevogarTokensDoUsuario(ctx, x.ID)) // efeito dentro da transação
		return boom
	})
	assert.ErrorIs(t, err, boom)

	depois, err := repo.GetByID(ctx, u.ID)
	require.NoError(t, err)
	assert.True(t, depois.Ativo, "a desativação foi desfeita")
	tk, err := tokens.GetByHash(ctx, "h-rollback")
	require.NoError(t, err)
	assert.Nil(t, tk.RevogadoEm, "a revogação dos tokens também foi desfeita")
}

func TestUsuarioRepository_Modificar_ContaInexistente(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)

	_, err := repo.Modificar(context.Background(), uuid.New(), func(context.Context, *identidade.Usuario, identidade.ContaTx) error {
		t.Fatal("fn não deve rodar para conta inexistente")
		return nil
	})
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

// Regressão do TOCTOU do "último admin": dois admins se desativam ao mesmo
// tempo. Sem o lock global, ambos veriam 2 admins ativos e passariam, deixando
// o sistema sem nenhum. Com o lock, exatamente um sucede.
func TestUsuarioRepository_Modificar_DoisAdminsSeDesativandoSimultaneamente(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)
	ctx := context.Background()

	a := novoUsuarioTeste(t, "a@test.local", identidade.PerfilAdmin)
	b := novoUsuarioTeste(t, "b@test.local", identidade.PerfilAdmin)
	require.NoError(t, repo.Save(ctx, a))
	require.NoError(t, repo.Save(ctx, b))

	desativar := func(alvo, ator uuid.UUID) error {
		_, err := repo.Modificar(ctx, alvo, func(ctx context.Context, u *identidade.Usuario, tx identidade.ContaTx) error {
			n, err := tx.ContarAdminsAtivos(ctx)
			if err != nil {
				return err
			}
			if n <= 1 {
				return shared.ErrUltimoAdmin
			}
			u.Desativar()
			return nil
		})
		return err
	}

	var wg sync.WaitGroup
	erros := make([]error, 2)
	wg.Add(2)
	go func() { defer wg.Done(); erros[0] = desativar(b.ID, a.ID) }() // A desativa B
	go func() { defer wg.Done(); erros[1] = desativar(a.ID, b.ID) }() // B desativa A
	wg.Wait()

	sucessos := 0
	for _, e := range erros {
		if e == nil {
			sucessos++
		} else {
			assert.ErrorIs(t, e, shared.ErrUltimoAdmin)
		}
	}
	assert.Equal(t, 1, sucessos, "exatamente uma desativação passa")

	var ativos int
	require.NoError(t, pool.QueryRow(ctx, `SELECT count(*) FROM usuarios WHERE perfil='ADMIN' AND ativo`).Scan(&ativos))
	assert.Equal(t, 1, ativos, "o sistema nunca fica sem administrador ativo")
}

// Regressão do lost update: a troca de senha do próprio usuário não pode
// reativar uma conta que um ADMIN desativou no meio do caminho.
func TestUsuarioRepository_Modificar_NaoPerdeAtualizacaoConcorrente(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	repo := NewPgxUsuarioRepository(pool)
	ctx := context.Background()

	u := novoUsuarioTeste(t, "u@test.local", identidade.PerfilTreinador)
	require.NoError(t, repo.Save(ctx, u))

	_, err := repo.Modificar(ctx, u.ID, func(ctx context.Context, x *identidade.Usuario, _ identidade.ContaTx) error {
		x.Desativar()
		return nil
	})
	require.NoError(t, err)

	// A "troca de senha" relê a conta sob lock, enxerga ativo=false e muda só a senha.
	_, err = repo.Modificar(ctx, u.ID, func(ctx context.Context, x *identidade.Usuario, _ identidade.ContaTx) error {
		x.DefinirSenha("novo-hash", false)
		return nil
	})
	require.NoError(t, err)

	final, err := repo.GetByID(ctx, u.ID)
	require.NoError(t, err)
	assert.False(t, final.Ativo, "a desativação anterior foi preservada")
	assert.Equal(t, "novo-hash", final.SenhaHash)
}

func TestRefreshTokenRepository_RevogarSeAtivo_SoUmaChamadaVence(t *testing.T) {
	pool := setupTestDB(t)
	truncateAll(t, pool)
	users := NewPgxUsuarioRepository(pool)
	repo := NewPgxRefreshTokenRepository(pool)
	ctx := context.Background()

	u := novoUsuarioTeste(t, "r@test.local", identidade.PerfilAdmin)
	require.NoError(t, users.Save(ctx, u))
	tk := novoRefreshTeste(u.ID, uuid.New(), "h-claim")
	require.NoError(t, repo.Save(ctx, tk))

	const n = 10
	var wg sync.WaitGroup
	var vencedores int32
	wg.Add(n)
	for i := 0; i < n; i++ {
		go func() {
			defer wg.Done()
			ok, err := repo.RevogarSeAtivo(ctx, tk.ID)
			if err == nil && ok {
				atomic.AddInt32(&vencedores, 1)
			}
		}()
	}
	wg.Wait()
	assert.EqualValues(t, 1, vencedores, "UPDATE ... WHERE revogado_em IS NULL é atômico: um só vence")

	ok, err := repo.RevogarSeAtivo(ctx, tk.ID)
	require.NoError(t, err)
	assert.False(t, ok, "token já revogado")
}
