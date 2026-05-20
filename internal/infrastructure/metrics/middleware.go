package metrics

import (
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
)

// HTTPMiddleware emite as métricas HTTP RED. Deve ser registrado APÓS
// `chimiddleware.RequestID` (sem dependência dura) e idealmente perto do
// final da chain, depois do roteamento — caso contrário `RoutePattern`
// vem vazio e cardinalidade do label `path` explode.
//
// Excluímos `/health` e `/metrics` para não poluir o histograma com
// scrapes do próprio Prometheus.
func HTTPMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Curto-circuito para os endpoints de telemetria.
			if r.URL.Path == "/health" || r.URL.Path == "/metrics" {
				next.ServeHTTP(w, r)
				return
			}

			start := time.Now()
			ww := chimiddleware.NewWrapResponseWriter(w, r.ProtoMajor)

			next.ServeHTTP(ww, r)

			// RoutePattern só é setado DEPOIS do match — por isso lemos
			// no defer/após o ServeHTTP. Quando vazio (404 do mux), usamos
			// "unmatched" para manter cardinalidade limitada.
			path := chi.RouteContext(r.Context()).RoutePattern()
			if path == "" {
				path = "unmatched"
			}
			status := strconv.Itoa(ww.Status())

			HTTPRequestsTotal.WithLabelValues(r.Method, path, status).Inc()
			HTTPRequestDuration.WithLabelValues(r.Method, path, status).
				Observe(time.Since(start).Seconds())
		})
	}
}
