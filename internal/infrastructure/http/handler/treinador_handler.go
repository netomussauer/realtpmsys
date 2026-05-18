package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	apptreinador "github.com/realtpmsys/realtpmsys/internal/application/treinador"
	domtreinador "github.com/realtpmsys/realtpmsys/internal/domain/treinador"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

type TreinadorHandler struct {
	cadastrar   *apptreinador.CadastrarTreinadorUseCase
	atualizar   *apptreinador.AtualizarTreinadorUseCase
	mudarStatus *apptreinador.MudarStatusTreinadorUseCase
	remover     *apptreinador.RemoverTreinadorUseCase
	repo        domtreinador.Repository
}

func NewTreinadorHandler(
	cadastrar *apptreinador.CadastrarTreinadorUseCase,
	atualizar *apptreinador.AtualizarTreinadorUseCase,
	mudarStatus *apptreinador.MudarStatusTreinadorUseCase,
	remover *apptreinador.RemoverTreinadorUseCase,
	repo domtreinador.Repository,
) *TreinadorHandler {
	return &TreinadorHandler{
		cadastrar:   cadastrar,
		atualizar:   atualizar,
		mudarStatus: mudarStatus,
		remover:     remover,
		repo:        repo,
	}
}

// ─── POST /treinadores ───────────────────────────────────────────────────────

func (h *TreinadorHandler) Cadastrar(w http.ResponseWriter, r *http.Request) {
	var body treinadorPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	if body.UsuarioID == nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "usuario_id é obrigatório"})
		return
	}
	t, err := h.cadastrar.Execute(r.Context(), apptreinador.CadastrarTreinadorInput{
		UsuarioID: *body.UsuarioID,
		Nome:      strings.TrimSpace(body.Nome),
		CPF:       body.CPF,
		CREF:      body.CREF,
		Telefone:  body.Telefone,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusCreated, toTreinadorResponse(t))
}

// ─── GET /treinadores ────────────────────────────────────────────────────────

func (h *TreinadorHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := domtreinador.ListFilter{
		Page:    parseInt(q.Get("page"), 1),
		PerPage: parseInt(q.Get("per_page"), 20),
		Nome:    strings.TrimSpace(q.Get("nome")),
	}
	if s := q.Get("status"); s != "" {
		st := domtreinador.Status(s)
		filter.Status = &st
	}
	rows, total, err := h.repo.List(r.Context(), filter)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data": toTreinadorResponses(rows),
		"pagination": map[string]any{
			"total":    total,
			"page":     filter.Page,
			"per_page": filter.PerPage,
		},
	})
}

// ─── GET /treinadores/{id} ───────────────────────────────────────────────────

func (h *TreinadorHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	t, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	if t == nil {
		http.NotFound(w, r)
		return
	}
	response.WriteJSON(w, http.StatusOK, toTreinadorResponse(t))
}

// ─── PUT /treinadores/{id} ───────────────────────────────────────────────────

func (h *TreinadorHandler) Atualizar(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	var body treinadorPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	t, err := h.atualizar.Execute(r.Context(), apptreinador.AtualizarTreinadorInput{
		ID:       id,
		Nome:     strings.TrimSpace(body.Nome),
		CPF:      body.CPF,
		CREF:     body.CREF,
		Telefone: body.Telefone,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toTreinadorResponse(t))
}

// ─── DELETE /treinadores/{id} ────────────────────────────────────────────────

func (h *TreinadorHandler) Remover(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	if err := h.remover.Execute(r.Context(), id); err != nil {
		response.WriteError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─── PATCH /treinadores/{id}/{acao} ──────────────────────────────────────────

func (h *TreinadorHandler) Inativar(w http.ResponseWriter, r *http.Request) {
	h.mudarStatusByAction(w, r, apptreinador.AcaoInativar)
}
func (h *TreinadorHandler) Ativar(w http.ResponseWriter, r *http.Request) {
	h.mudarStatusByAction(w, r, apptreinador.AcaoAtivar)
}

func (h *TreinadorHandler) mudarStatusByAction(w http.ResponseWriter, r *http.Request, acao apptreinador.AcaoStatus) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	t, err := h.mudarStatus.Execute(r.Context(), id, acao)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toTreinadorResponse(t))
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

type treinadorPayload struct {
	UsuarioID *uuid.UUID `json:"usuario_id,omitempty"`
	Nome      string     `json:"nome"`
	CPF       *string    `json:"cpf,omitempty"`
	CREF      *string    `json:"cref,omitempty"`
	Telefone  *string    `json:"telefone,omitempty"`
}

type treinadorResponse struct {
	ID           uuid.UUID `json:"id"`
	UsuarioID    uuid.UUID `json:"usuario_id"`
	Nome         string    `json:"nome"`
	CPF          *string   `json:"cpf,omitempty"`
	CREF         *string   `json:"cref,omitempty"`
	Telefone     *string   `json:"telefone,omitempty"`
	Status       string    `json:"status"`
	CriadoEm     time.Time `json:"criado_em"`
	AtualizadoEm time.Time `json:"atualizado_em"`
}

func toTreinadorResponse(t *domtreinador.Treinador) treinadorResponse {
	return treinadorResponse{
		ID:           t.ID,
		UsuarioID:    t.UsuarioID,
		Nome:         t.Nome,
		CPF:          t.CPF,
		CREF:         t.CREF,
		Telefone:     t.Telefone,
		Status:       string(t.Status),
		CriadoEm:     t.CriadoEm,
		AtualizadoEm: t.AtualizadoEm,
	}
}

func toTreinadorResponses(ts []*domtreinador.Treinador) []treinadorResponse {
	out := make([]treinadorResponse, len(ts))
	for i, t := range ts {
		out[i] = toTreinadorResponse(t)
	}
	return out
}
