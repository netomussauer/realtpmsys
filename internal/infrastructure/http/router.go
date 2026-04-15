// Package http configura o router Chi com todos os middlewares e rotas.
package http

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/handler"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/middleware"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

// NewRouter constrói o router com todas as rotas e middlewares registrados.
func NewRouter(
	jwtSecret string,
	mensalidadeH *handler.MensalidadeHandler,
	// TODO: adicionar handlers de Atleta, Turma, Frequência conforme implementados
) http.Handler {
	r := chi.NewRouter()

	// ── Middlewares globais ──────────────────────────────────────────────────
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.StripSlashes)

	// ── Health check (sem autenticação) ─────────────────────────────────────
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		response.WriteJSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "realtpmsys",
		})
	})

	// ── API v1 ───────────────────────────────────────────────────────────────
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.Auth(jwtSecret))

		// ── Financeiro ───────────────────────────────────────────────────────
		r.Route("/mensalidades", func(r chi.Router) {
			r.Use(middleware.RequirePerfil("ADMIN", "RESPONSAVEL"))
			r.Get("/", mensalidadeH.List)

			// Geração e rotas admin-only
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePerfil("ADMIN"))
				r.Post("/gerar", mensalidadeH.Gerar)
				r.Get("/{id}", mensalidadeH.GetByID)
				r.Patch("/{id}/pagar", mensalidadeH.Pagar)
				r.Patch("/{id}/cancelar", mensalidadeH.Cancelar)
			})
		})

		// TODO: registrar rotas de /atletas, /turmas, /treinos, /relatorios
	})

	return r
}
