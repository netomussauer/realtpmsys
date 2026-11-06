package identidade

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func init() {
	// Custo mínimo: a suíte faz dezenas de hashes e o custo 12 de produção
	// levaria segundos sem mudar o que está sendo testado.
	bcryptCost = bcrypt.MinCost
}

// ── fakes ────────────────────────────────────────────────────────────────────

// fakeContas simula o ContaRepository. Modificar é fiel à transação real:
// roda fn sobre uma CÓPIA e só aplica o resultado (e os efeitos de revogação
// de tokens) se fn terminar sem erro — assim os testes também verificam que
// uma falha no meio não deixa estado parcial.
type fakeContas struct {
	porID   map[uuid.UUID]*identidade.Usuario
	saveErr error
	getErr  error
	saves   int

	// efeitos de ContaTx aplicados no commit
	revogouTodos   []uuid.UUID
	revogouExceto  []uuid.UUID // usuários
	familiaPoupada uuid.UUID
	revogarErr     error
}

func newFakeContas(us ...*identidade.Usuario) *fakeContas {
	f := &fakeContas{porID: map[uuid.UUID]*identidade.Usuario{}}
	for _, u := range us {
		f.porID[u.ID] = u
	}
	return f
}

func (f *fakeContas) GetByEmail(_ context.Context, email string) (*identidade.Usuario, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	for _, u := range f.porID {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, nil
}
func (f *fakeContas) GetByID(_ context.Context, id uuid.UUID) (*identidade.Usuario, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	return f.porID[id], nil
}
func (f *fakeContas) List(context.Context, identidade.ListFilter) ([]*identidade.Usuario, int64, error) {
	return nil, 0, nil
}
func (f *fakeContas) Save(_ context.Context, u *identidade.Usuario) error {
	if f.saveErr != nil {
		return f.saveErr
	}
	f.saves++
	f.porID[u.ID] = u
	return nil
}

func (f *fakeContas) Modificar(
	ctx context.Context,
	id uuid.UUID,
	fn func(ctx context.Context, u *identidade.Usuario, tx identidade.ContaTx) error,
) (*identidade.Usuario, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	original := f.porID[id]
	if original == nil {
		return nil, shared.ErrNotFound
	}
	cp := *original
	tx := &fakeTx{f: f}
	if err := fn(ctx, &cp, tx); err != nil {
		return nil, err // rollback: nada aplicado
	}
	if f.saveErr != nil {
		return nil, f.saveErr
	}
	*original = cp // commit
	f.saves++
	f.revogouTodos = append(f.revogouTodos, tx.todos...)
	f.revogouExceto = append(f.revogouExceto, tx.exceto...)
	if len(tx.exceto) > 0 {
		f.familiaPoupada = tx.familia
	}
	return original, nil
}

type fakeTx struct {
	f       *fakeContas
	todos   []uuid.UUID
	exceto  []uuid.UUID
	familia uuid.UUID
}

func (t *fakeTx) ContarAdminsAtivos(context.Context) (int64, error) {
	var n int64
	for _, u := range t.f.porID {
		if u.Perfil == identidade.PerfilAdmin && u.Ativo {
			n++
		}
	}
	return n, nil
}
func (t *fakeTx) RevogarTokensDoUsuario(_ context.Context, id uuid.UUID) error {
	if t.f.revogarErr != nil {
		return t.f.revogarErr
	}
	t.todos = append(t.todos, id)
	return nil
}
func (t *fakeTx) RevogarTokensDoUsuarioExceto(_ context.Context, id, fam uuid.UUID) error {
	if t.f.revogarErr != nil {
		return t.f.revogarErr
	}
	t.exceto = append(t.exceto, id)
	t.familia = fam
	return nil
}

type fakeTokens struct {
	porHash map[string]*identidade.RefreshToken
	getErr  error
}

func newFakeTokens() *fakeTokens {
	return &fakeTokens{porHash: map[string]*identidade.RefreshToken{}}
}

func (f *fakeTokens) Save(_ context.Context, t *identidade.RefreshToken) error {
	f.porHash[t.TokenHash] = t
	return nil
}
func (f *fakeTokens) GetByHash(_ context.Context, h string) (*identidade.RefreshToken, error) {
	if f.getErr != nil {
		return nil, f.getErr
	}
	return f.porHash[h], nil
}
func (f *fakeTokens) Revogar(_ context.Context, id uuid.UUID) error {
	_, err := f.RevogarSeAtivo(context.Background(), id)
	return err
}
func (f *fakeTokens) RevogarSeAtivo(_ context.Context, id uuid.UUID) (bool, error) {
	for _, t := range f.porHash {
		if t.ID == id {
			if t.RevogadoEm != nil {
				return false, nil
			}
			now := time.Now()
			t.RevogadoEm = &now
			return true, nil
		}
	}
	return false, nil
}
func (f *fakeTokens) RevogarFamilia(_ context.Context, fam uuid.UUID) error {
	for _, t := range f.porHash {
		if t.FamiliaID == fam && t.RevogadoEm == nil {
			now := time.Now()
			t.RevogadoEm = &now
		}
	}
	return nil
}
func (f *fakeTokens) RevogarTodosDoUsuario(context.Context, uuid.UUID) error { return nil }
func (f *fakeTokens) RevogarTodosDoUsuarioExceto(context.Context, uuid.UUID, uuid.UUID) error {
	return nil
}

func novoUsr(t *testing.T, email string, perfil identidade.Perfil) *identidade.Usuario {
	t.Helper()
	hash, err := hashSenha("senhaAtual123")
	require.NoError(t, err)
	u, err := identidade.NovoUsuario(email, "", perfil, hash, false)
	require.NoError(t, err)
	return u
}

// ── CriarUsuario ─────────────────────────────────────────────────────────────

func TestCriarUsuario_Sucesso(t *testing.T) {
	repo := newFakeContas()
	uc := NewCriarUsuarioUseCase(repo)

	out, err := uc.Execute(context.Background(), CriarUsuarioInput{
		Email: " Nova@Example.com ", Nome: "Nova Pessoa", Perfil: "treinador",
	})
	require.NoError(t, err)

	assert.Equal(t, "nova@example.com", out.Usuario.Email)
	assert.Equal(t, identidade.PerfilTreinador, out.Usuario.Perfil)
	assert.True(t, out.Usuario.DeveTrocarSenha, "senha temporária exige troca")
	assert.True(t, out.Usuario.Ativo)
	assert.NoError(t, identidade.ValidarSenha(out.SenhaTemporaria))
	assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(out.Usuario.SenhaHash), []byte(out.SenhaTemporaria)),
		"o hash salvo corresponde à senha devolvida")
	assert.NotContains(t, out.Usuario.SenhaHash, out.SenhaTemporaria)
	assert.Equal(t, 1, repo.saves)
}

func TestCriarUsuario_Erros(t *testing.T) {
	existente := novoUsr(t, "ja@example.com", identidade.PerfilAdmin)

	tests := []struct {
		name   string
		repo   *fakeContas
		in     CriarUsuarioInput
		wantIs error
	}{
		{"perfil inválido", newFakeContas(), CriarUsuarioInput{Email: "a@b.co", Perfil: "ROOT"}, shared.ErrPerfilInvalido},
		{"e-mail inválido", newFakeContas(), CriarUsuarioInput{Email: "x", Perfil: "ADMIN"}, shared.ErrEmailInvalido},
		{"e-mail em uso", newFakeContas(existente), CriarUsuarioInput{Email: "JA@example.com", Perfil: "ADMIN"}, shared.ErrEmailEmUso},
		{"corrida: save devolve e-mail em uso", &fakeContas{porID: map[uuid.UUID]*identidade.Usuario{}, saveErr: shared.ErrEmailEmUso},
			CriarUsuarioInput{Email: "n@b.co", Perfil: "ADMIN"}, shared.ErrEmailEmUso},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := NewCriarUsuarioUseCase(tt.repo).Execute(context.Background(), tt.in)
			assert.ErrorIs(t, err, tt.wantIs)
		})
	}

	t.Run("erro de repositório é propagado", func(t *testing.T) {
		boom := errors.New("boom")
		_, err := NewCriarUsuarioUseCase(&fakeContas{getErr: boom}).Execute(context.Background(),
			CriarUsuarioInput{Email: "a@b.co", Perfil: "ADMIN"})
		assert.ErrorIs(t, err, boom)
	})
}

// ── AtualizarUsuario ─────────────────────────────────────────────────────────

func TestAtualizarUsuario_NomeSemRevogarTokens(t *testing.T) {
	ator := novoUsr(t, "adm@example.com", identidade.PerfilAdmin)
	alvo := novoUsr(t, "t@example.com", identidade.PerfilTreinador)
	repo := newFakeContas(ator, alvo)

	nome := "  Treinador Silva "
	got, err := NewAtualizarUsuarioUseCase(repo).Execute(context.Background(),
		AtualizarUsuarioInput{ID: alvo.ID, AtorID: ator.ID, Nome: &nome})
	require.NoError(t, err)
	assert.Equal(t, "Treinador Silva", got.Nome)
	assert.Empty(t, repo.revogouTodos)
}

func TestAtualizarUsuario_MudarPerfilRevogaTokens(t *testing.T) {
	ator := novoUsr(t, "adm@example.com", identidade.PerfilAdmin)
	alvo := novoUsr(t, "t@example.com", identidade.PerfilTreinador)
	repo := newFakeContas(ator, alvo)

	perfil := "ADMIN"
	got, err := NewAtualizarUsuarioUseCase(repo).Execute(context.Background(),
		AtualizarUsuarioInput{ID: alvo.ID, AtorID: ator.ID, Perfil: &perfil})
	require.NoError(t, err)
	assert.Equal(t, identidade.PerfilAdmin, got.Perfil)
	assert.Equal(t, []uuid.UUID{alvo.ID}, repo.revogouTodos)
}

func TestAtualizarUsuario_MesmoPerfilNaoRevoga(t *testing.T) {
	ator := novoUsr(t, "adm@example.com", identidade.PerfilAdmin)
	alvo := novoUsr(t, "t@example.com", identidade.PerfilTreinador)
	repo := newFakeContas(ator, alvo)

	perfil := "TREINADOR"
	_, err := NewAtualizarUsuarioUseCase(repo).Execute(context.Background(),
		AtualizarUsuarioInput{ID: alvo.ID, AtorID: ator.ID, Perfil: &perfil})
	require.NoError(t, err)
	assert.Empty(t, repo.revogouTodos)
}

func TestAtualizarUsuario_RebaixamentoDeAdmin(t *testing.T) {
	t.Run("não pode rebaixar a si mesmo", func(t *testing.T) {
		a1 := novoUsr(t, "a1@example.com", identidade.PerfilAdmin)
		a2 := novoUsr(t, "a2@example.com", identidade.PerfilAdmin)
		repo := newFakeContas(a1, a2)
		perfil := "TREINADOR"
		_, err := NewAtualizarUsuarioUseCase(repo).Execute(context.Background(),
			AtualizarUsuarioInput{ID: a1.ID, AtorID: a1.ID, Perfil: &perfil})
		assert.ErrorIs(t, err, shared.ErrAutoModificacao)
		assert.Equal(t, identidade.PerfilAdmin, a1.Perfil)
	})
	t.Run("não pode rebaixar o último admin ativo", func(t *testing.T) {
		unico := novoUsr(t, "u@example.com", identidade.PerfilAdmin)
		outro := novoUsr(t, "o@example.com", identidade.PerfilAdmin)
		outro.Desativar() // ator hipotético (inativo) — só importa que não é o alvo
		repo := newFakeContas(unico, outro)
		perfil := "TREINADOR"
		_, err := NewAtualizarUsuarioUseCase(repo).Execute(context.Background(),
			AtualizarUsuarioInput{ID: unico.ID, AtorID: outro.ID, Perfil: &perfil})
		assert.ErrorIs(t, err, shared.ErrUltimoAdmin)
		assert.Equal(t, identidade.PerfilAdmin, unico.Perfil)
	})
	t.Run("pode rebaixar quando há outro admin ativo", func(t *testing.T) {
		a1 := novoUsr(t, "a1@example.com", identidade.PerfilAdmin)
		a2 := novoUsr(t, "a2@example.com", identidade.PerfilAdmin)
		repo := newFakeContas(a1, a2)
		perfil := "TREINADOR"
		got, err := NewAtualizarUsuarioUseCase(repo).Execute(context.Background(),
			AtualizarUsuarioInput{ID: a2.ID, AtorID: a1.ID, Perfil: &perfil})
		require.NoError(t, err)
		assert.Equal(t, identidade.PerfilTreinador, got.Perfil)
	})
}

func TestAtualizarUsuario_Erros(t *testing.T) {
	ator := novoUsr(t, "adm@example.com", identidade.PerfilAdmin)
	alvo := novoUsr(t, "t@example.com", identidade.PerfilTreinador)
	uc := NewAtualizarUsuarioUseCase(newFakeContas(ator, alvo))

	_, err := uc.Execute(context.Background(), AtualizarUsuarioInput{ID: uuid.New(), AtorID: ator.ID})
	assert.ErrorIs(t, err, shared.ErrNotFound)

	ruim := "ROOT"
	_, err = uc.Execute(context.Background(), AtualizarUsuarioInput{ID: alvo.ID, AtorID: ator.ID, Perfil: &ruim})
	assert.ErrorIs(t, err, shared.ErrPerfilInvalido)
	assert.Equal(t, identidade.PerfilTreinador, alvo.Perfil)
}

func TestAtualizarUsuario_FalhaNaRevogacaoDesfazTudo(t *testing.T) {
	ator := novoUsr(t, "adm@example.com", identidade.PerfilAdmin)
	alvo := novoUsr(t, "t@example.com", identidade.PerfilTreinador)
	repo := newFakeContas(ator, alvo)
	repo.revogarErr = errors.New("db fora")

	perfil := "ADMIN"
	_, err := NewAtualizarUsuarioUseCase(repo).Execute(context.Background(),
		AtualizarUsuarioInput{ID: alvo.ID, AtorID: ator.ID, Perfil: &perfil})

	assert.Error(t, err)
	assert.Equal(t, identidade.PerfilTreinador, alvo.Perfil, "sem revogação não há promoção: a transação é atômica")
}

// ── AlterarStatus ────────────────────────────────────────────────────────────

func TestAlterarStatus_DesativarRevogaTokens(t *testing.T) {
	ator := novoUsr(t, "adm@example.com", identidade.PerfilAdmin)
	alvo := novoUsr(t, "t@example.com", identidade.PerfilTreinador)
	repo := newFakeContas(ator, alvo)

	got, err := NewAlterarStatusUsuarioUseCase(repo).Execute(context.Background(), alvo.ID, ator.ID, false)
	require.NoError(t, err)
	assert.False(t, got.Ativo)
	assert.Equal(t, []uuid.UUID{alvo.ID}, repo.revogouTodos)
}

func TestAlterarStatus_AtivarNaoRevogaTokens(t *testing.T) {
	ator := novoUsr(t, "adm@example.com", identidade.PerfilAdmin)
	alvo := novoUsr(t, "t@example.com", identidade.PerfilTreinador)
	alvo.Desativar()
	repo := newFakeContas(ator, alvo)

	got, err := NewAlterarStatusUsuarioUseCase(repo).Execute(context.Background(), alvo.ID, ator.ID, true)
	require.NoError(t, err)
	assert.True(t, got.Ativo)
	assert.Empty(t, repo.revogouTodos)
}

func TestAlterarStatus_Protecoes(t *testing.T) {
	t.Run("admin não desativa a si mesmo", func(t *testing.T) {
		a1 := novoUsr(t, "a1@example.com", identidade.PerfilAdmin)
		a2 := novoUsr(t, "a2@example.com", identidade.PerfilAdmin)
		_, err := NewAlterarStatusUsuarioUseCase(newFakeContas(a1, a2)).
			Execute(context.Background(), a1.ID, a1.ID, false)
		assert.ErrorIs(t, err, shared.ErrAutoModificacao)
		assert.True(t, a1.Ativo)
	})
	t.Run("não desativa o último admin ativo", func(t *testing.T) {
		unico := novoUsr(t, "u@example.com", identidade.PerfilAdmin)
		ator := novoUsr(t, "x@example.com", identidade.PerfilAdmin)
		ator.Desativar()
		_, err := NewAlterarStatusUsuarioUseCase(newFakeContas(unico, ator)).
			Execute(context.Background(), unico.ID, ator.ID, false)
		assert.ErrorIs(t, err, shared.ErrUltimoAdmin)
		assert.True(t, unico.Ativo)
	})
	t.Run("desativar admin já inativo é permitido (idempotente)", func(t *testing.T) {
		a1 := novoUsr(t, "a1@example.com", identidade.PerfilAdmin)
		a2 := novoUsr(t, "a2@example.com", identidade.PerfilAdmin)
		a2.Desativar()
		_, err := NewAlterarStatusUsuarioUseCase(newFakeContas(a1, a2)).
			Execute(context.Background(), a2.ID, a1.ID, false)
		assert.NoError(t, err)
	})
	t.Run("usuário inexistente", func(t *testing.T) {
		_, err := NewAlterarStatusUsuarioUseCase(newFakeContas()).
			Execute(context.Background(), uuid.New(), uuid.New(), false)
		assert.ErrorIs(t, err, shared.ErrNotFound)
	})
	t.Run("falha ao revogar tokens desfaz a desativação (atomicidade)", func(t *testing.T) {
		ator := novoUsr(t, "adm@example.com", identidade.PerfilAdmin)
		alvo := novoUsr(t, "t@example.com", identidade.PerfilTreinador)
		repo := newFakeContas(ator, alvo)
		repo.revogarErr = errors.New("db fora")

		_, err := NewAlterarStatusUsuarioUseCase(repo).Execute(context.Background(), alvo.ID, ator.ID, false)

		assert.Error(t, err)
		assert.True(t, alvo.Ativo, "a conta não pode ficar desativada com as sessões ainda vivas")
	})
}

// ── RedefinirSenha ───────────────────────────────────────────────────────────

func TestRedefinirSenha_Sucesso(t *testing.T) {
	ator := novoUsr(t, "adm@example.com", identidade.PerfilAdmin)
	alvo := novoUsr(t, "t@example.com", identidade.PerfilTreinador)
	hashAntigo := alvo.SenhaHash
	repo := newFakeContas(ator, alvo)

	out, err := NewRedefinirSenhaUseCase(repo).Execute(context.Background(), alvo.ID, ator.ID)
	require.NoError(t, err)

	assert.NoError(t, identidade.ValidarSenha(out.SenhaTemporaria))
	assert.NotEqual(t, hashAntigo, out.Usuario.SenhaHash)
	assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(out.Usuario.SenhaHash), []byte(out.SenhaTemporaria)))
	assert.True(t, out.Usuario.DeveTrocarSenha)
	assert.Equal(t, []uuid.UUID{alvo.ID}, repo.revogouTodos)
}

func TestRedefinirSenha_Erros(t *testing.T) {
	ator := novoUsr(t, "adm@example.com", identidade.PerfilAdmin)
	repo := newFakeContas(ator)
	uc := NewRedefinirSenhaUseCase(repo)

	_, err := uc.Execute(context.Background(), ator.ID, ator.ID)
	assert.ErrorIs(t, err, shared.ErrAutoModificacao)
	assert.Equal(t, 0, repo.saves, "nada é salvo ao negar")

	_, err = uc.Execute(context.Background(), uuid.New(), ator.ID)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

// ── AlterarMinhaSenha ────────────────────────────────────────────────────────

func TestAlterarMinhaSenha_Sucesso(t *testing.T) {
	u := novoUsr(t, "u@example.com", identidade.PerfilResponsavel)
	u.DeveTrocarSenha = true
	repo := newFakeContas(u)

	err := NewAlterarMinhaSenhaUseCase(repo, newFakeTokens()).Execute(context.Background(), AlterarMinhaSenhaInput{
		UsuarioID: u.ID, SenhaAtual: "senhaAtual123", NovaSenha: "outraSenha456",
	})
	require.NoError(t, err)

	assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(u.SenhaHash), []byte("outraSenha456")))
	assert.False(t, u.DeveTrocarSenha, "troca bem-sucedida limpa a flag")
	assert.Equal(t, []uuid.UUID{u.ID}, repo.revogouTodos, "sem refresh informado, revoga tudo")
	assert.Empty(t, repo.revogouExceto)
}

func TestAlterarMinhaSenha_PreservaSessaoAtual(t *testing.T) {
	u := novoUsr(t, "u@example.com", identidade.PerfilResponsavel)
	repo, tokens := newFakeContas(u), newFakeTokens()
	fam := uuid.New()
	tokens.porHash[HashRefreshToken("meu-refresh")] = &identidade.RefreshToken{
		ID: uuid.New(), UsuarioID: u.ID, FamiliaID: fam, ExpiraEm: time.Now().Add(time.Hour),
	}

	err := NewAlterarMinhaSenhaUseCase(repo, tokens).Execute(context.Background(), AlterarMinhaSenhaInput{
		UsuarioID: u.ID, SenhaAtual: "senhaAtual123", NovaSenha: "outraSenha456", RefreshToken: "meu-refresh",
	})
	require.NoError(t, err)
	assert.Equal(t, []uuid.UUID{u.ID}, repo.revogouExceto)
	assert.Equal(t, fam, repo.familiaPoupada)
	assert.Empty(t, repo.revogouTodos)
}

func TestAlterarMinhaSenha_RefreshDeOutroUsuarioNaoEPoupado(t *testing.T) {
	u := novoUsr(t, "u@example.com", identidade.PerfilResponsavel)
	repo, tokens := newFakeContas(u), newFakeTokens()
	tokens.porHash[HashRefreshToken("alheio")] = &identidade.RefreshToken{
		ID: uuid.New(), UsuarioID: uuid.New(), FamiliaID: uuid.New(),
	}

	err := NewAlterarMinhaSenhaUseCase(repo, tokens).Execute(context.Background(), AlterarMinhaSenhaInput{
		UsuarioID: u.ID, SenhaAtual: "senhaAtual123", NovaSenha: "outraSenha456", RefreshToken: "alheio",
	})
	require.NoError(t, err)
	assert.Empty(t, repo.revogouExceto, "token de outro usuário nunca define a sessão poupada")
	assert.Equal(t, []uuid.UUID{u.ID}, repo.revogouTodos)
}

func TestAlterarMinhaSenha_Erros(t *testing.T) {
	inativo := novoUsr(t, "i@example.com", identidade.PerfilResponsavel)
	inativo.Desativar()

	tests := []struct {
		name   string
		repo   func(u *identidade.Usuario) *fakeContas
		in     func(id uuid.UUID) AlterarMinhaSenhaInput
		wantIs error
	}{
		{"senha atual incorreta",
			func(u *identidade.Usuario) *fakeContas { return newFakeContas(u) },
			func(id uuid.UUID) AlterarMinhaSenhaInput {
				return AlterarMinhaSenhaInput{UsuarioID: id, SenhaAtual: "errada12345", NovaSenha: "outraSenha456"}
			}, shared.ErrSenhaAtualIncorreta},
		{"nova igual à atual",
			func(u *identidade.Usuario) *fakeContas { return newFakeContas(u) },
			func(id uuid.UUID) AlterarMinhaSenhaInput {
				return AlterarMinhaSenhaInput{UsuarioID: id, SenhaAtual: "senhaAtual123", NovaSenha: "senhaAtual123"}
			}, shared.ErrSenhaIgualAnterior},
		{"nova senha fraca",
			func(u *identidade.Usuario) *fakeContas { return newFakeContas(u) },
			func(id uuid.UUID) AlterarMinhaSenhaInput {
				return AlterarMinhaSenhaInput{UsuarioID: id, SenhaAtual: "senhaAtual123", NovaSenha: "curta1"}
			}, shared.ErrSenhaFraca},
		{"usuário inexistente",
			func(*identidade.Usuario) *fakeContas { return newFakeContas() },
			func(id uuid.UUID) AlterarMinhaSenhaInput {
				return AlterarMinhaSenhaInput{UsuarioID: id, SenhaAtual: "senhaAtual123", NovaSenha: "outraSenha456"}
			}, shared.ErrNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			u := novoUsr(t, "u@example.com", identidade.PerfilResponsavel)
			hashAntes := u.SenhaHash
			repo := tt.repo(u)
			err := NewAlterarMinhaSenhaUseCase(repo, newFakeTokens()).Execute(context.Background(), tt.in(u.ID))
			assert.ErrorIs(t, err, tt.wantIs)
			assert.Equal(t, hashAntes, u.SenhaHash, "falha não altera a senha")
			assert.Empty(t, repo.revogouTodos)
		})
	}

	t.Run("conta inativa não é reativada pela troca de senha", func(t *testing.T) {
		repo := newFakeContas(inativo)
		err := NewAlterarMinhaSenhaUseCase(repo, newFakeTokens()).Execute(context.Background(),
			AlterarMinhaSenhaInput{UsuarioID: inativo.ID, SenhaAtual: "senhaAtual123", NovaSenha: "outraSenha456"})
		assert.ErrorIs(t, err, shared.ErrUsuarioInativo)
		assert.False(t, inativo.Ativo)
	})
}

func TestHashRefreshToken_DeterministicoE64Hex(t *testing.T) {
	h := HashRefreshToken("abc")
	assert.Len(t, h, 64)
	assert.Equal(t, h, HashRefreshToken("abc"))
	assert.NotEqual(t, h, HashRefreshToken("abd"))
	assert.NotContains(t, h, "abc")
}
