package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

// auditAttrs guarda atributos enriquecidos por middlewares downstream (Auth)
// que precisam ser lidos pelo defer do Audit. Como `Auth` injeta valores via
// `r.WithContext(ctx)`, o `*http.Request` original no Audit não vê o novo
// contexto — por isso usamos um ponteiro mutável compartilhado.
type auditAttrs struct {
	UserID string
	Perfil string
}

type auditAttrsKey struct{}

// auditAttrsFromContext devolve o holder de atributos de auditoria, se houver.
// Usado pelo middleware Auth para anexar user_id/perfil ao log estruturado.
func auditAttrsFromContext(ctx context.Context) *auditAttrs {
	if a, ok := ctx.Value(auditAttrsKey{}).(*auditAttrs); ok {
		return a
	}
	return nil
}

// Audit emite um log estruturado JSON por request com método, path, status,
// latência, request_id, IP e — quando autenticado — user_id e perfil.
//
// Deve ser registrado APÓS `middleware.RequestID` (para capturar o request_id)
// e antes de `Recoverer`/handlers. O middleware `Auth` (downstream) escreve em
// um holder mutável injetado aqui, permitindo capturar user_id mesmo que `Auth`
// crie um novo request via `r.WithContext`.
func Audit(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Healthcheck não precisa de log estruturado (ruído alto, sinal baixo).
			if r.URL.Path == "/health" {
				next.ServeHTTP(w, r)
				return
			}

			start := time.Now()
			ww := chimiddleware.NewWrapResponseWriter(w, r.ProtoMajor)

			info := &auditAttrs{}
			ctx := context.WithValue(r.Context(), auditAttrsKey{}, info)
			r = r.WithContext(ctx)

			defer func() {
				dur := time.Since(start)
				attrs := []any{
					"method", r.Method,
					"path", r.URL.Path,
					"status", ww.Status(),
					"latency_ms", dur.Milliseconds(),
					"bytes", ww.BytesWritten(),
					"ip", r.RemoteAddr,
					"request_id", chimiddleware.GetReqID(r.Context()),
				}
				if info.UserID != "" {
					attrs = append(attrs, "user_id", info.UserID)
				}
				if info.Perfil != "" {
					attrs = append(attrs, "perfil", info.Perfil)
				}
				switch {
				case ww.Status() >= 500:
					logger.Error("http", attrs...)
				case ww.Status() >= 400:
					logger.Warn("http", attrs...)
				default:
					logger.Info("http", attrs...)
				}
			}()

			next.ServeHTTP(ww, r)
		})
	}
}
