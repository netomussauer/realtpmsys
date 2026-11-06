package handler

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	appidentidade "github.com/realtpmsys/realtpmsys/internal/application/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/ratelimit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

// ── fakes ────────────────────────────────────────────────────────────────────

type fakeContasRepo struct {
	usuarios     map[uuid.UUID]*identidade.Usuario
	ultimoList   identidade.ListFilter
	revogouTodos []uuid.UUID
}

func (f *fakeContasRepo) GetByEmail(_ context.Context, email string) (*identidade.Usuario, error) {
	for _, u := range f.usuarios {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, nil
}
func (f *fakeContasRepo) GetByID(_ context.Context, id uuid.UUID) (*identidade.Usuario, error) {
	return f.usuarios[id], nil
}
func (f *fakeContasRepo) List(_ context.Context, fl identidade.ListFilter) ([]*identidade.Usuario, int64, error) {
	f.ultimoList = fl
	out := make([]*identidade.Usuario, 0, len(f.usuarios))
	for _, u := range f.usuarios {
		out = append(out, u)
	}
	return out, int64(len(out)), nil
}
func (f *fakeContasRepo) Save(_ context.Context, u *identidade.Usuario) error {
	f.usuarios[u.ID] = u
	return nil
}

// Modificar é fiel à transação: opera numa cópia e só aplica no sucesso.
func (f *fakeContasRepo) Modificar(
	ctx context.Context,
	id uuid.UUID,
	fn func(ctx context.Context, u *identidade.Usuario, tx identidade.ContaTx) error,
) (*identidade.Usuario, error) {
	original := f.usuarios[id]
	if original == nil {
		return nil, shared.ErrNotFound
	}
	cp := *original
	tx := &fakeContaTx{f: f}
	if err := fn(ctx, &cp, tx); err != nil {
		return nil, err
	}
	*original = cp
	f.revogouTodos = append(f.revogouTodos, tx.todos...)
	return original, nil
}

type fakeContaTx struct {
	f     *fakeContasRepo
	todos []uuid.UUID
}

func (t *fakeContaTx) ContarAdminsAtivos(context.Context) (int64, error) {
	var n int64
	for _, u := range t.f.usuarios {
		if u.Perfil == identidade.PerfilAdmin && u.Ativo {
			n++
		}
	}
	return n, nil
}
func (t *fakeContaTx) RevogarTokensDoUsuario(_ context.Context, id uuid.UUID) error {
	t.todos = append(t.todos, id)
	return nil
}
func (t *fakeContaTx) RevogarTokensDoUsuarioExceto(_ context.Context, id, _ uuid.UUID) error {
	t.todos = append(t.todos, id)
	return nil
}

type fakeRefreshRepo struct{}

func (f *fakeRefreshRepo) Save(context.Context, *identidade.RefreshToken) error { return nil }
func (f *fakeRefreshRepo) GetByHash(context.Context, string) (*identidade.RefreshToken, error) {
	return nil, nil
}
func (f *fakeRefreshRepo) Revogar(context.Context, uuid.UUID) error               { return nil }
func (f *fakeRefreshRepo) RevogarFamilia(context.Context, uuid.UUID) error        { return nil }
func (f *fakeRefreshRepo) RevogarTodosDoUsuario(context.Context, uuid.UUID) error { return nil }
func (f *fakeRefreshRepo) RevogarSeAtivo(context.Context, uuid.UUID) (bool, error) {
	return true, nil
}
func (f *fakeRefreshRepo) RevogarTodosDoUsuarioExceto(context.Context, uuid.UUID, uuid.UUID) error {
	return nil
}

// ── harness ──────────────────────────────────────────────────────────────────

type usuarioHarness struct {
	router chi.Router
	contas *fakeContasRepo
	tokens *fakeRefreshRepo
	admin  *identidade.Usuario
}

func novoUsuarioHarness(t *testing.T) *usuarioHarness {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte("senhaAtual123"), bcrypt.MinCost)
	require.NoError(t, err)
	admin, err := identidade.NovoUsuario("adm@example.com", "Adm", identidade.PerfilAdmin, string(hash), false)
	require.NoError(t, err)
	outroAdmin, err := identidade.NovoUsuario("adm2@example.com", "Adm2", identidade.PerfilAdmin, string(hash), false)
	require.NoError(t, err)

	contas := &fakeContasRepo{usuarios: map[uuid.UUID]*identidade.Usuario{admin.ID: admin, outroAdmin.ID: outroAdmin}}
	tokens := &fakeRefreshRepo{}
	h := NewUsuarioHandler(
		appidentidade.NewCriarUsuarioUseCase(contas),
		appidentidade.NewAtualizarUsuarioUseCase(contas),
		appidentidade.NewAlterarStatusUsuarioUseCase(contas),
		appidentidade.NewRedefinirSenhaUseCase(contas),
		appidentidade.NewAlterarMinhaSenhaUseCase(contas, tokens),
		contas,
		ratelimit.New(3, time.Minute),
	)
	r := chi.NewRouter()
	r.Get("/usuarios", h.List)
	r.Post("/usuarios", h.Criar)
	r.Get("/usuarios/{id}", h.GetByID)
	r.Put("/usuarios/{id}", h.Atualizar)
	r.Patch("/usuarios/{id}/ativar", h.Ativar)
	r.Patch("/usuarios/{id}/desativar", h.Desativar)
	r.Post("/usuarios/{id}/redefinir-senha", h.RedefinirSenha)
	r.Patch("/me/senha", h.AlterarMinhaSenha)
	return &usuarioHarness{router: r, contas: contas, tokens: tokens, admin: admin}
}

func (h *usuarioHarness) do(method, target string, atorID uuid.UUID, body any) *httptest.ResponseRecorder {
	var buf bytes.Buffer
	if s, ok := body.(string); ok {
		buf.WriteString(s)
	} else if body != nil {
		_ = json.NewEncoder(&buf).Encode(body)
	}
	ctx := requestComAuth(method, target, atorID.String(), "ADMIN").Context()
	req := httptest.NewRequest(method, target, &buf).WithContext(ctx)
	w := httptest.NewRecorder()
	h.router.ServeHTTP(w, req)
	return w
}

// ── testes ───────────────────────────────────────────────────────────────────

func TestUsuarioCriar_RespondeSenhaTemporariaSemVazarHash(t *testing.T) {
	h := novoUsuarioHarness(t)
	w := h.do(http.MethodPost, "/usuarios", h.admin.ID, map[string]string{
		"email": "Novo@Example.com", "nome": "Novo", "perfil": "TREINADOR",
	})

	require.Equal(t, http.StatusCreated, w.Code, w.Body.String())
	assert.Equal(t, "no-store", w.Header().Get("Cache-Control"))
	assert.NotContains(t, w.Body.String(), "senha_hash")

	var got map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	assert.Equal(t, "novo@example.com", got["email"])
	assert.Equal(t, "TREINADOR", got["perfil"])
	assert.Equal(t, true, got["deve_trocar_senha"])
	senha, _ := got["senha_temporaria"].(string)
	assert.NoError(t, identidade.ValidarSenha(senha))
}

func TestUsuarioCriar_Erros(t *testing.T) {
	tests := []struct {
		name     string
		body     any
		wantCode int
	}{
		{"json inválido", "{nao-json", http.StatusBadRequest},
		{"e-mail duplicado", map[string]string{"email": "ADM@example.com", "perfil": "ADMIN"}, http.StatusConflict},
		{"perfil inválido", map[string]string{"email": "a@b.co", "perfil": "ROOT"}, http.StatusUnprocessableEntity},
		{"e-mail inválido", map[string]string{"email": "x", "perfil": "ADMIN"}, http.StatusUnprocessableEntity},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := novoUsuarioHarness(t)
			w := h.do(http.MethodPost, "/usuarios", h.admin.ID, tt.body)
			assert.Equal(t, tt.wantCode, w.Code, w.Body.String())
			assert.NotContains(t, w.Body.String(), "senha_temporaria")
		})
	}
}

func TestUsuarioList_RepassaFiltros(t *testing.T) {
	h := novoUsuarioHarness(t)
	w := h.do(http.MethodGet, "/usuarios?busca=%20ana%20&perfil=treinador&ativo=false&page=2&per_page=5", h.admin.ID, nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())

	f := h.contas.ultimoList
	assert.Equal(t, "ana", f.Busca)
	require.NotNil(t, f.Perfil)
	assert.Equal(t, identidade.PerfilTreinador, *f.Perfil)
	require.NotNil(t, f.Ativo)
	assert.False(t, *f.Ativo)
	assert.Equal(t, 2, f.Page)
	assert.Equal(t, 5, f.PerPage)
	assert.NotContains(t, w.Body.String(), "senha_hash")
	assert.Contains(t, w.Body.String(), `"pagination"`)
}

func TestUsuarioList_FiltrosInvalidos(t *testing.T) {
	h := novoUsuarioHarness(t)
	assert.Equal(t, http.StatusBadRequest, h.do(http.MethodGet, "/usuarios?perfil=ROOT", h.admin.ID, nil).Code)
	assert.Equal(t, http.StatusBadRequest, h.do(http.MethodGet, "/usuarios?ativo=talvez", h.admin.ID, nil).Code)
}

func TestUsuarioGetByID(t *testing.T) {
	h := novoUsuarioHarness(t)
	assert.Equal(t, http.StatusOK, h.do(http.MethodGet, "/usuarios/"+h.admin.ID.String(), h.admin.ID, nil).Code)
	assert.Equal(t, http.StatusNotFound, h.do(http.MethodGet, "/usuarios/"+uuid.NewString(), h.admin.ID, nil).Code)
	assert.Equal(t, http.StatusBadRequest, h.do(http.MethodGet, "/usuarios/nao-uuid", h.admin.ID, nil).Code)
}

func TestUsuarioAtualizar(t *testing.T) {
	h := novoUsuarioHarness(t)
	alvo, err := identidade.NovoUsuario("t@example.com", "", identidade.PerfilTreinador, "h", false)
	require.NoError(t, err)
	h.contas.usuarios[alvo.ID] = alvo

	w := h.do(http.MethodPut, "/usuarios/"+alvo.ID.String(), h.admin.ID, map[string]string{"nome": "Treinador Silva", "perfil": "RESPONSAVEL"})
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "Treinador Silva", alvo.Nome)
	assert.Equal(t, identidade.PerfilResponsavel, alvo.Perfil)
	assert.Equal(t, []uuid.UUID{alvo.ID}, h.contas.revogouTodos, "mudança de perfil derruba as sessões")

	// Admin rebaixando a si mesmo → 422.
	w = h.do(http.MethodPut, "/usuarios/"+h.admin.ID.String(), h.admin.ID, map[string]string{"perfil": "TREINADOR"})
	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
	assert.Equal(t, identidade.PerfilAdmin, h.admin.Perfil)
}

func TestUsuarioDesativarEAtivar(t *testing.T) {
	h := novoUsuarioHarness(t)
	alvo, err := identidade.NovoUsuario("t@example.com", "", identidade.PerfilTreinador, "h", false)
	require.NoError(t, err)
	h.contas.usuarios[alvo.ID] = alvo

	w := h.do(http.MethodPatch, "/usuarios/"+alvo.ID.String()+"/desativar", h.admin.ID, nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.False(t, alvo.Ativo)
	assert.Equal(t, []uuid.UUID{alvo.ID}, h.contas.revogouTodos)

	w = h.do(http.MethodPatch, "/usuarios/"+alvo.ID.String()+"/ativar", h.admin.ID, nil)
	require.Equal(t, http.StatusOK, w.Code)
	assert.True(t, alvo.Ativo)

	// Desativar a si mesmo → 422.
	w = h.do(http.MethodPatch, "/usuarios/"+h.admin.ID.String()+"/desativar", h.admin.ID, nil)
	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
	assert.True(t, h.admin.Ativo)
}

func TestUsuarioRedefinirSenha(t *testing.T) {
	h := novoUsuarioHarness(t)
	alvo, err := identidade.NovoUsuario("t@example.com", "", identidade.PerfilTreinador, "hash-antigo", false)
	require.NoError(t, err)
	h.contas.usuarios[alvo.ID] = alvo

	w := h.do(http.MethodPost, "/usuarios/"+alvo.ID.String()+"/redefinir-senha", h.admin.ID, nil)
	require.Equal(t, http.StatusOK, w.Code, w.Body.String())
	assert.Equal(t, "no-store", w.Header().Get("Cache-Control"))

	var got map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &got))
	senha, _ := got["senha_temporaria"].(string)
	assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(alvo.SenhaHash), []byte(senha)))
	assert.True(t, alvo.DeveTrocarSenha)
	assert.NotContains(t, w.Body.String(), alvo.SenhaHash)

	// A própria conta → 422 e nada muda.
	hashAntes := h.admin.SenhaHash
	w = h.do(http.MethodPost, "/usuarios/"+h.admin.ID.String()+"/redefinir-senha", h.admin.ID, nil)
	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
	assert.Equal(t, hashAntes, h.admin.SenhaHash)
}

func TestUsuarioAlterarMinhaSenha(t *testing.T) {
	t.Run("sucesso devolve 204 sem corpo", func(t *testing.T) {
		h := novoUsuarioHarness(t)
		w := h.do(http.MethodPatch, "/me/senha", h.admin.ID, map[string]string{
			"senha_atual": "senhaAtual123", "nova_senha": "outraSenha456",
		})
		assert.Equal(t, http.StatusNoContent, w.Code, w.Body.String())
		assert.Empty(t, w.Body.String())
		assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(h.admin.SenhaHash), []byte("outraSenha456")))
		assert.Equal(t, []uuid.UUID{h.admin.ID}, h.contas.revogouTodos)
	})
	t.Run("senha atual errada → 422", func(t *testing.T) {
		h := novoUsuarioHarness(t)
		w := h.do(http.MethodPatch, "/me/senha", h.admin.ID, map[string]string{
			"senha_atual": "errada123456", "nova_senha": "outraSenha456",
		})
		assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
	})
	t.Run("nova senha fraca → 422", func(t *testing.T) {
		h := novoUsuarioHarness(t)
		w := h.do(http.MethodPatch, "/me/senha", h.admin.ID, map[string]string{
			"senha_atual": "senhaAtual123", "nova_senha": "curta1",
		})
		assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
	})
	t.Run("campos obrigatórios → 400", func(t *testing.T) {
		h := novoUsuarioHarness(t)
		w := h.do(http.MethodPatch, "/me/senha", h.admin.ID, map[string]string{"senha_atual": "senhaAtual123"})
		assert.Equal(t, http.StatusBadRequest, w.Code)
	})
	t.Run("sem contexto autenticado → 401", func(t *testing.T) {
		h := novoUsuarioHarness(t)
		req := httptest.NewRequest(http.MethodPatch, "/me/senha", strings.NewReader(`{}`))
		w := httptest.NewRecorder()
		h.router.ServeHTTP(w, req)
		assert.Equal(t, http.StatusUnauthorized, w.Code)
	})
}

func TestUsuarioCriar_CorpoGrandeDemaisEhRejeitado(t *testing.T) {
	h := novoUsuarioHarness(t)
	grande := `{"email":"a@b.co","perfil":"ADMIN","nome":"` + strings.Repeat("x", maxBodyBytes) + `"}`
	w := h.do(http.MethodPost, "/usuarios", h.admin.ID, grande)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}

func TestUsuarioAlterarMinhaSenha_BloqueiaAposFalhasDeSenhaAtual(t *testing.T) {
	h := novoUsuarioHarness(t) // limite do harness: 3 falhas
	errada := map[string]string{"senha_atual": "errada1234567", "nova_senha": "outraSenha456"}

	for i := 0; i < 3; i++ {
		w := h.do(http.MethodPatch, "/me/senha", h.admin.ID, errada)
		require.Equal(t, http.StatusUnprocessableEntity, w.Code, "tentativa %d", i+1)
	}

	// 4ª tentativa — mesmo com a senha CERTA — é barrada pelo limitador.
	certa := map[string]string{"senha_atual": "senhaAtual123", "nova_senha": "outraSenha456"}
	w := h.do(http.MethodPatch, "/me/senha", h.admin.ID, certa)

	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.NotEmpty(t, w.Header().Get("Retry-After"))
	assert.NoError(t, bcrypt.CompareHashAndPassword([]byte(h.admin.SenhaHash), []byte("senhaAtual123")),
		"a senha não foi trocada enquanto bloqueado")
}

func TestUsuarioAlterarMinhaSenha_BloqueioEPorUsuario(t *testing.T) {
	h := novoUsuarioHarness(t)
	errada := map[string]string{"senha_atual": "errada1234567", "nova_senha": "outraSenha456"}
	for i := 0; i < 3; i++ {
		h.do(http.MethodPatch, "/me/senha", h.admin.ID, errada)
	}

	var outro uuid.UUID
	for id := range h.contas.usuarios {
		if id != h.admin.ID {
			outro = id
		}
	}
	w := h.do(http.MethodPatch, "/me/senha", outro, errada)
	assert.Equal(t, http.StatusUnprocessableEntity, w.Code, "outro usuário não é afetado pelo bloqueio")
}

func TestUsuarioAlterarMinhaSenha_SucessoZeraAsFalhas(t *testing.T) {
	h := novoUsuarioHarness(t)
	errada := map[string]string{"senha_atual": "errada1234567", "nova_senha": "outraSenha456"}
	h.do(http.MethodPatch, "/me/senha", h.admin.ID, errada)
	h.do(http.MethodPatch, "/me/senha", h.admin.ID, errada)

	w := h.do(http.MethodPatch, "/me/senha", h.admin.ID, map[string]string{"senha_atual": "senhaAtual123", "nova_senha": "outraSenha456"})
	require.Equal(t, http.StatusNoContent, w.Code)

	// Após o sucesso o contador recomeça: 2 novas falhas ainda não bloqueiam.
	nova := map[string]string{"senha_atual": "errada1234567", "nova_senha": "terceiraSenha789"}
	assert.Equal(t, http.StatusUnprocessableEntity, h.do(http.MethodPatch, "/me/senha", h.admin.ID, nova).Code)
	assert.Equal(t, http.StatusUnprocessableEntity, h.do(http.MethodPatch, "/me/senha", h.admin.ID, nova).Code)
}

func TestUsuarioDesativar_FalhaNaoDeixaEstadoParcial(t *testing.T) {
	h := novoUsuarioHarness(t)
	// Desativar a si mesmo é recusado dentro da transação: a conta segue ativa
	// e nenhuma sessão é revogada.
	w := h.do(http.MethodPatch, "/usuarios/"+h.admin.ID.String()+"/desativar", h.admin.ID, nil)
	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)
	assert.True(t, h.admin.Ativo)
	assert.Empty(t, h.contas.revogouTodos)
	_ = shared.ErrAutoModificacao
}
