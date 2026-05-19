package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const testJWTSecret = "audit-test-secret"

// jsonLogger constrói um slog.Logger que serializa para um *bytes.Buffer.
// Cada chamada de logger.X("http", ...) gera uma linha JSON nele.
func jsonLogger(buf io.Writer) *slog.Logger {
	return slog.New(slog.NewJSONHandler(buf, &slog.HandlerOptions{Level: slog.LevelInfo}))
}

// readLastLog consome o buffer e devolve o último objeto JSON gravado.
func readLastLog(t *testing.T, buf *bytes.Buffer) map[string]any {
	t.Helper()
	require.NotEmpty(t, buf.Bytes(), "logger não emitiu nenhuma linha")
	var record map[string]any
	dec := json.NewDecoder(buf)
	for dec.More() {
		require.NoError(t, dec.Decode(&record))
	}
	return record
}

func TestAudit_PulaHealthSemLogar(t *testing.T) {
	buf := &bytes.Buffer{}
	r := chi.NewRouter()
	r.Use(chimiddleware.RequestID)
	r.Use(Audit(jsonLogger(buf)))
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	srv := httptest.NewServer(r)
	defer srv.Close()
	resp, err := http.Get(srv.URL + "/health")
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Empty(t, buf.Bytes(), "healthcheck não deve gerar log")
}

func TestAudit_RotaPublicaSemUserID(t *testing.T) {
	buf := &bytes.Buffer{}
	r := chi.NewRouter()
	r.Use(chimiddleware.RequestID)
	r.Use(Audit(jsonLogger(buf)))
	r.Get("/ping", func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("pong"))
	})

	srv := httptest.NewServer(r)
	defer srv.Close()
	resp, err := http.Get(srv.URL + "/ping")
	require.NoError(t, err)
	defer resp.Body.Close()

	rec := readLastLog(t, buf)
	assert.Equal(t, "http", rec["msg"])
	assert.Equal(t, "GET", rec["method"])
	assert.Equal(t, "/ping", rec["path"])
	assert.EqualValues(t, http.StatusOK, rec["status"])
	assert.EqualValues(t, 4, rec["bytes"]) // "pong"
	assert.NotEmpty(t, rec["request_id"], "request_id deve ser propagado do middleware RequestID")
	assert.NotContains(t, rec, "user_id")
	assert.NotContains(t, rec, "perfil")
}

func TestAudit_CapturaUserIDQuandoAuthRoda(t *testing.T) {
	buf := &bytes.Buffer{}
	r := chi.NewRouter()
	r.Use(chimiddleware.RequestID)
	r.Use(Audit(jsonLogger(buf)))
	r.Group(func(r chi.Router) {
		r.Use(Auth(testJWTSecret))
		r.Get("/protected", func(w http.ResponseWriter, _ *http.Request) {
			w.WriteHeader(http.StatusOK)
		})
	})

	userID := uuid.New().String()
	tokenStr := assinarToken(t, jwt.MapClaims{
		"user_id": userID,
		"perfil":  "ADMIN",
		"typ":     "access",
		"exp":     time.Now().Add(time.Hour).Unix(),
	})

	srv := httptest.NewServer(r)
	defer srv.Close()
	req, _ := http.NewRequest(http.MethodGet, srv.URL+"/protected", nil)
	req.Header.Set("Authorization", "Bearer "+tokenStr)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	rec := readLastLog(t, buf)
	assert.Equal(t, userID, rec["user_id"])
	assert.Equal(t, "ADMIN", rec["perfil"])
}

func TestAudit_LogLevelPorStatus(t *testing.T) {
	cases := []struct {
		name        string
		status      int
		expectedLvl string
	}{
		{"2xx vira info", http.StatusOK, "INFO"},
		{"4xx vira warn", http.StatusBadRequest, "WARN"},
		{"5xx vira error", http.StatusInternalServerError, "ERROR"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			buf := &bytes.Buffer{}
			r := chi.NewRouter()
			r.Use(chimiddleware.RequestID)
			r.Use(Audit(jsonLogger(buf)))
			r.Get("/x", func(w http.ResponseWriter, _ *http.Request) {
				w.WriteHeader(tc.status)
			})

			srv := httptest.NewServer(r)
			defer srv.Close()
			resp, err := http.Get(srv.URL + "/x")
			require.NoError(t, err)
			defer resp.Body.Close()

			rec := readLastLog(t, buf)
			assert.Equal(t, tc.expectedLvl, rec["level"])
		})
	}
}

func assinarToken(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	tk := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := tk.SignedString([]byte(testJWTSecret))
	require.NoError(t, err)
	return s
}
