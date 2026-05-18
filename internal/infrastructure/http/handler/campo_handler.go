package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"

	"github.com/google/uuid"
	appcampo "github.com/realtpmsys/realtpmsys/internal/application/campo"
	domcampo "github.com/realtpmsys/realtpmsys/internal/domain/campo"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

type CampoHandler struct {
	criar     *appcampo.CriarCampoUseCase
	atualizar *appcampo.AtualizarCampoUseCase
	toggle    *appcampo.ToggleCampoUseCase
	repo      domcampo.Repository
}

func NewCampoHandler(
	criar *appcampo.CriarCampoUseCase,
	atualizar *appcampo.AtualizarCampoUseCase,
	toggle *appcampo.ToggleCampoUseCase,
	repo domcampo.Repository,
) *CampoHandler {
	return &CampoHandler{criar: criar, atualizar: atualizar, toggle: toggle, repo: repo}
}

// ─── POST /campos ────────────────────────────────────────────────────────────

func (h *CampoHandler) Criar(w http.ResponseWriter, r *http.Request) {
	var body campoPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	c, err := h.criar.Execute(r.Context(), appcampo.CriarCampoInput{
		Nome:          strings.TrimSpace(body.Nome),
		Endereco:      body.Endereco,
		CapacidadeMax: body.CapacidadeMax,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusCreated, toCampoResponse(c))
}

// ─── GET /campos ─────────────────────────────────────────────────────────────

func (h *CampoHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := domcampo.ListFilter{
		Page:    parseInt(q.Get("page"), 1),
		PerPage: parseInt(q.Get("per_page"), 20),
		Nome:    strings.TrimSpace(q.Get("nome")),
	}
	if v := q.Get("ativo"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "ativo inválido (use true/false)"})
			return
		}
		filter.Ativo = &b
	}
	rows, total, err := h.repo.List(r.Context(), filter)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data": toCampoResponses(rows),
		"pagination": map[string]any{
			"total":    total,
			"page":     filter.Page,
			"per_page": filter.PerPage,
		},
	})
}

// ─── GET /campos/{id} ────────────────────────────────────────────────────────

func (h *CampoHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	c, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	if c == nil {
		http.NotFound(w, r)
		return
	}
	response.WriteJSON(w, http.StatusOK, toCampoResponse(c))
}

// ─── PUT /campos/{id} ────────────────────────────────────────────────────────

func (h *CampoHandler) Atualizar(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	var body campoPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	c, err := h.atualizar.Execute(r.Context(), appcampo.AtualizarCampoInput{
		ID:            id,
		Nome:          strings.TrimSpace(body.Nome),
		Endereco:      body.Endereco,
		CapacidadeMax: body.CapacidadeMax,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toCampoResponse(c))
}

// ─── PATCH /campos/{id}/ativar | /inativar ──────────────────────────────────

func (h *CampoHandler) Ativar(w http.ResponseWriter, r *http.Request) {
	h.toggleAction(w, r, true)
}
func (h *CampoHandler) Inativar(w http.ResponseWriter, r *http.Request) {
	h.toggleAction(w, r, false)
}

func (h *CampoHandler) toggleAction(w http.ResponseWriter, r *http.Request, ativar bool) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	c, err := h.toggle.Execute(r.Context(), id, ativar)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toCampoResponse(c))
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

type campoPayload struct {
	Nome          string  `json:"nome"`
	Endereco      *string `json:"endereco,omitempty"`
	CapacidadeMax *int    `json:"capacidade_max,omitempty"`
}

type campoResponse struct {
	ID            uuid.UUID `json:"id"`
	Nome          string    `json:"nome"`
	Endereco      *string   `json:"endereco,omitempty"`
	CapacidadeMax *int      `json:"capacidade_max,omitempty"`
	Ativo         bool      `json:"ativo"`
}

func toCampoResponse(c *domcampo.Campo) campoResponse {
	return campoResponse{
		ID:            c.ID,
		Nome:          c.Nome,
		Endereco:      c.Endereco,
		CapacidadeMax: c.CapacidadeMax,
		Ativo:         c.Ativo,
	}
}

func toCampoResponses(cs []*domcampo.Campo) []campoResponse {
	out := make([]campoResponse, len(cs))
	for i, c := range cs {
		out[i] = toCampoResponse(c)
	}
	return out
}
