package handler

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	appidentidade "github.com/realtpmsys/realtpmsys/internal/application/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/ratelimit"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func novoAuthHandlerParaTeste(t *testing.T, limite int) (*AuthHandler, *identidade.Usuario) {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte("senhaCerta123"), bcrypt.MinCost)
	require.NoError(t, err)
	u, err := identidade.NovoUsuario("ana@example.com", "Ana", identidade.PerfilTreinador, string(hash), false)
	require.NoError(t, err)

	contas := &fakeContasRepo{usuarios: map[uuid.UUID]*identidade.Usuario{u.ID: u}}
	login := appidentidade.NewLoginUseCase(contas, &fakeRefreshRepo{}, "segredo-de-teste-do-auth-handler", 15, 7)
	return NewAuthHandler(login, nil, nil, ratelimit.New(limite, time.Minute)), u
}

func chamarLogin(h *AuthHandler, email, senha string) *httptest.ResponseRecorder {
	corpo, _ := json.Marshal(map[string]string{"email": email, "senha": senha})
	req := httptest.NewRequest(http.MethodPost, "/auth/login", bytes.NewReader(corpo))
	w := httptest.NewRecorder()
	h.Login(w, req)
	return w
}

func TestLogin_BloqueiaOEmailAposTentativasErradas(t *testing.T) {
	h, _ := novoAuthHandlerParaTeste(t, 3)

	for i := 0; i < 3; i++ {
		assert.Equal(t, http.StatusUnauthorized, chamarLogin(h, "ana@example.com", "errada").Code, "tentativa %d", i+1)
	}

	// Mesmo com a senha CERTA, o e-mail bloqueado é barrado antes do bcrypt.
	w := chamarLogin(h, "ana@example.com", "senhaCerta123")
	assert.Equal(t, http.StatusTooManyRequests, w.Code)
	assert.NotEmpty(t, w.Header().Get("Retry-After"))
	assert.NotContains(t, w.Body.String(), "access_token")
}

func TestLogin_BloqueioNaoVazaSeAContaExiste(t *testing.T) {
	h, _ := novoAuthHandlerParaTeste(t, 2)
	for i := 0; i < 2; i++ {
		chamarLogin(h, "fantasma@example.com", "x")
	}
	// E-mail inexistente é bloqueado exatamente como um existente.
	assert.Equal(t, http.StatusTooManyRequests, chamarLogin(h, "fantasma@example.com", "x").Code)
}

func TestLogin_BloqueioEPorEmail(t *testing.T) {
	h, _ := novoAuthHandlerParaTeste(t, 1)
	chamarLogin(h, "a@example.com", "x")
	assert.Equal(t, http.StatusTooManyRequests, chamarLogin(h, "a@example.com", "x").Code)
	assert.Equal(t, http.StatusUnauthorized, chamarLogin(h, "b@example.com", "x").Code, "outro e-mail não é afetado")
}

func TestLogin_NormalizaOEmailNaChaveDoLimitador(t *testing.T) {
	h, _ := novoAuthHandlerParaTeste(t, 2)
	chamarLogin(h, "ANA@example.com", "x")
	chamarLogin(h, "  ana@EXAMPLE.com ", "x")
	// Variações de caixa/espaço contam na MESMA chave: não dá para contornar o limite.
	assert.Equal(t, http.StatusTooManyRequests, chamarLogin(h, "Ana@Example.COM", "x").Code)
}

func TestLogin_SucessoZeraAsTentativas(t *testing.T) {
	h, _ := novoAuthHandlerParaTeste(t, 3)
	chamarLogin(h, "ana@example.com", "x")
	chamarLogin(h, "ana@example.com", "x")

	require.Equal(t, http.StatusOK, chamarLogin(h, "ana@example.com", "senhaCerta123").Code)

	for i := 0; i < 2; i++ {
		assert.Equal(t, http.StatusUnauthorized, chamarLogin(h, "ana@example.com", "x").Code, "cota recomeçou do zero")
	}
}

func TestLogin_ContaInativaComSenhaCertaNaoConsomeCota(t *testing.T) {
	h, u := novoAuthHandlerParaTeste(t, 2)
	u.Desativar()

	for i := 0; i < 5; i++ {
		w := chamarLogin(h, "ana@example.com", "senhaCerta123")
		assert.Equal(t, http.StatusUnauthorized, w.Code, "inativa responde 401, nunca 429, enquanto a senha está certa")
	}
}

func TestLogin_EmailGrandeDemaisEhRecusadoAntesDoLimitador(t *testing.T) {
	h, _ := novoAuthHandlerParaTeste(t, 3)
	gigante := strings.Repeat("a", 255) + "@example.com"
	assert.Equal(t, http.StatusBadRequest, chamarLogin(h, gigante, "x").Code)
}

func TestLogin_CorpoGrandeDemaisEhRecusado(t *testing.T) {
	h, _ := novoAuthHandlerParaTeste(t, 3)
	corpo := `{"email":"a@b.co","senha":"` + strings.Repeat("x", maxBodyBytes) + `"}`
	req := httptest.NewRequest(http.MethodPost, "/auth/login", strings.NewReader(corpo))
	w := httptest.NewRecorder()
	h.Login(w, req)
	assert.Equal(t, http.StatusBadRequest, w.Code)
}
