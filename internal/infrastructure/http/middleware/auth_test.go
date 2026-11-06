package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/assert"
)

const authTestSecret = "segredo-de-teste-do-middleware-auth"

func assinar(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	claims["exp"] = time.Now().Add(time.Hour).Unix()
	s, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(authTestSecret))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

func chamar(t *testing.T, token, path string) (code int, chegouAoHandler bool) {
	t.Helper()
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		chegouAoHandler = true
		w.WriteHeader(http.StatusOK)
	})
	req := httptest.NewRequest(http.MethodGet, path, nil)
	req.Header.Set("Authorization", "Bearer "+token)
	w := httptest.NewRecorder()
	Auth(authTestSecret)(next).ServeHTTP(w, req)
	return w.Code, chegouAoHandler
}

func TestAuth_SessaoComSenhaTemporariaSoAlcancaATrocaDeSenha(t *testing.T) {
	token := assinar(t, jwt.MapClaims{"user_id": "u1", "perfil": "ADMIN", "typ": "access", "dts": true})

	code, chegou := chamar(t, token, PathTrocaSenha)
	assert.Equal(t, http.StatusOK, code)
	assert.True(t, chegou, "a troca de senha deve passar")

	for _, path := range []string{"/api/v1/atletas", "/api/v1/usuarios", "/api/v1/me", "/api/v1/me/senha/x"} {
		code, chegou := chamar(t, token, path)
		assert.Equal(t, http.StatusForbidden, code, path)
		assert.False(t, chegou, "%s não pode chegar ao handler", path)
	}
}

func TestAuth_SessaoNormalNaoTemTrava(t *testing.T) {
	token := assinar(t, jwt.MapClaims{"user_id": "u1", "perfil": "ADMIN", "typ": "access"})
	for _, path := range []string{"/api/v1/atletas", PathTrocaSenha} {
		code, chegou := chamar(t, token, path)
		assert.Equal(t, http.StatusOK, code, path)
		assert.True(t, chegou)
	}
}

func TestAuth_DtsFalsoNaoTrava(t *testing.T) {
	token := assinar(t, jwt.MapClaims{"user_id": "u1", "perfil": "ADMIN", "typ": "access", "dts": false})
	code, _ := chamar(t, token, "/api/v1/atletas")
	assert.Equal(t, http.StatusOK, code)
}

func TestAuth_RefreshTokenNaoServeEmRotaProtegida(t *testing.T) {
	token := assinar(t, jwt.MapClaims{"user_id": "u1", "perfil": "ADMIN", "typ": "refresh"})
	code, chegou := chamar(t, token, "/api/v1/atletas")
	assert.Equal(t, http.StatusUnauthorized, code)
	assert.False(t, chegou)
}
