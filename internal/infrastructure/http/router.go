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

// Handlers agrupa as dependências de handler injetadas no router.
type Handlers struct {
	Auth        *handler.AuthHandler
	Atleta      *handler.AtletaHandler
	Turma       *handler.TurmaHandler
	Treino      *handler.TreinoHandler
	Mensalidade *handler.MensalidadeHandler
	Contrato    *handler.ContratoHandler
}

// NewRouter constrói o router com todas as rotas e middlewares registrados.
func NewRouter(jwtSecret string, h Handlers) http.Handler {
	r := chi.NewRouter()

	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(chimiddleware.Recoverer)
	r.Use(chimiddleware.StripSlashes)

	// ── Rotas públicas ───────────────────────────────────────────────────────
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		response.WriteJSON(w, http.StatusOK, map[string]string{
			"status":  "ok",
			"service": "realtpmsys",
		})
	})

	r.Route("/auth", func(r chi.Router) {
		r.Post("/login", h.Auth.Login)
	})

	// ── API v1 (JWT obrigatório) ─────────────────────────────────────────────
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.Auth(jwtSecret))

		// Atletas
		r.Route("/atletas", func(r chi.Router) {
			// Leituras liberadas para ADMIN e TREINADOR
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePerfil("ADMIN", "TREINADOR"))
				r.Get("/", h.Atleta.List)
				r.Get("/{id}", h.Atleta.GetByID)
			})
			// Escritas restritas a ADMIN
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePerfil("ADMIN"))
				r.Post("/", h.Atleta.Cadastrar)
				r.Put("/{id}", h.Atleta.Atualizar)
				r.Delete("/{id}", h.Atleta.Remover)
				r.Patch("/{id}/inativar", h.Atleta.Inativar)
				r.Patch("/{id}/suspender", h.Atleta.Suspender)
				r.Patch("/{id}/reativar", h.Atleta.Reativar)
			})
		})

		// Turmas
		r.Route("/turmas", func(r chi.Router) {
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePerfil("ADMIN", "TREINADOR"))
				r.Get("/", h.Turma.List)
				r.Get("/{id}", h.Turma.GetByID)
				r.Get("/{id}/matriculas", h.Turma.ListMatriculas)
				r.Get("/{id}/treinos", h.Treino.ListPorTurma)
			})
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePerfil("ADMIN"))
				r.Post("/", h.Turma.Criar)
				r.Put("/{id}", h.Turma.Atualizar)
				r.Patch("/{id}/encerrar", h.Turma.Encerrar)
				r.Patch("/{id}/suspender", h.Turma.Suspender)
				r.Patch("/{id}/reativar", h.Turma.Reativar)
				r.Post("/{id}/matriculas", h.Turma.Matricular)
			})
			// Criação de treino — ADMIN e TREINADOR
			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePerfil("ADMIN", "TREINADOR"))
				r.Post("/{id}/treinos", h.Treino.Criar)
			})
		})

		// Treinos — frequências
		r.Route("/treinos", func(r chi.Router) {
			r.Use(middleware.RequirePerfil("ADMIN", "TREINADOR"))
			r.Get("/{id}/frequencias", h.Treino.ListFrequencias)
			r.Post("/{id}/frequencias", h.Treino.LancarFrequencias)
		})

		// Matrículas — endpoint avulso para cancelamento
		r.Route("/matriculas", func(r chi.Router) {
			r.Use(middleware.RequirePerfil("ADMIN"))
			r.Patch("/{id}/cancelar", h.Turma.CancelarMatricula)
		})

		// Contratos — apenas ADMIN
		r.Route("/contratos", func(r chi.Router) {
			r.Use(middleware.RequirePerfil("ADMIN"))
			r.Post("/", h.Contrato.Firmar)
		})

		// Mensalidades
		r.Route("/mensalidades", func(r chi.Router) {
			r.Use(middleware.RequirePerfil("ADMIN", "RESPONSAVEL"))
			r.Get("/", h.Mensalidade.List)

			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePerfil("ADMIN"))
				r.Post("/gerar", h.Mensalidade.Gerar)
				r.Get("/{id}", h.Mensalidade.GetByID)
				r.Patch("/{id}/pagar", h.Mensalidade.Pagar)
				r.Patch("/{id}/cancelar", h.Mensalidade.Cancelar)
			})
		})
	})

	return r
}
