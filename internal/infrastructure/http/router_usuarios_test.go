package http

import (
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/handler"
	"github.com/stretchr/testify/assert"
)

const testJWTSecret = "segredo-de-teste-do-router-usuarios"

func tokenParaTeste(t *testing.T, perfil string) string {
	t.Helper()
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": uuid.NewString(),
		"perfil":  perfil,
		"typ":     "access",
		"exp":     time.Now().Add(time.Hour).Unix(),
	})
	s, err := tok.SignedString([]byte(testJWTSecret))
	if err != nil {
		t.Fatal(err)
	}
	return s
}

// A gestão de contas é só ADMIN. O handler nem chega a ser invocado nos casos
// negados (RequirePerfil responde antes), então use cases nil bastam aqui.
func TestRotasUsuarios_SoAdmin(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(testJWTSecret, logger, Handlers{Usuario: handler.NewUsuarioHandler(nil, nil, nil, nil, nil, nil, nil)})

	id := uuid.NewString()
	rotas := []struct{ method, path string }{
		{http.MethodGet, "/api/v1/usuarios"},
		{http.MethodPost, "/api/v1/usuarios"},
		{http.MethodGet, "/api/v1/usuarios/" + id},
		{http.MethodPut, "/api/v1/usuarios/" + id},
		{http.MethodPatch, "/api/v1/usuarios/" + id + "/ativar"},
		{http.MethodPatch, "/api/v1/usuarios/" + id + "/desativar"},
		{http.MethodPost, "/api/v1/usuarios/" + id + "/redefinir-senha"},
	}

	for _, rota := range rotas {
		for _, perfil := range []string{"TREINADOR", "RESPONSAVEL"} {
			t.Run(rota.method+" "+rota.path+" como "+perfil, func(t *testing.T) {
				req := httptest.NewRequest(rota.method, rota.path, nil)
				req.Header.Set("Authorization", "Bearer "+tokenParaTeste(t, perfil))
				w := httptest.NewRecorder()
				router.ServeHTTP(w, req)
				assert.Equal(t, http.StatusForbidden, w.Code)
			})
		}
		t.Run(rota.method+" "+rota.path+" sem token", func(t *testing.T) {
			w := httptest.NewRecorder()
			router.ServeHTTP(w, httptest.NewRequest(rota.method, rota.path, nil))
			assert.Equal(t, http.StatusUnauthorized, w.Code)
		})
	}
}

func TestRotaMeSenha_ExigeAutenticacao(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	router := NewRouter(testJWTSecret, logger, Handlers{Usuario: handler.NewUsuarioHandler(nil, nil, nil, nil, nil, nil, nil)})

	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodPatch, "/api/v1/me/senha", nil))
	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
