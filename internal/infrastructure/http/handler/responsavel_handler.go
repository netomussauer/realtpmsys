package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	appatleta "github.com/realtpmsys/realtpmsys/internal/application/atleta"
	domainatleta "github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

type ResponsavelHandler struct {
	adicionar    *appatleta.AdicionarResponsavelUseCase
	atualizar    *appatleta.AtualizarResponsavelUseCase
	remover      *appatleta.RemoverResponsavelUseCase
	setUniforme  *appatleta.SetUniformeUseCase
	respRepo     domainatleta.ResponsavelRepository
	uniformeRepo domainatleta.UniformeRepository
	// atletaRepo é usado para autorizar acessos de perfil RESPONSAVEL em
	// rotas sub-recurso (/atletas/{id}/responsaveis, /atletas/{id}/uniforme).
	atletaRepo domainatleta.Repository
}

func NewResponsavelHandler(
	adicionar *appatleta.AdicionarResponsavelUseCase,
	atualizar *appatleta.AtualizarResponsavelUseCase,
	remover *appatleta.RemoverResponsavelUseCase,
	setUniforme *appatleta.SetUniformeUseCase,
	respRepo domainatleta.ResponsavelRepository,
	uniformeRepo domainatleta.UniformeRepository,
	atletaRepo domainatleta.Repository,
) *ResponsavelHandler {
	return &ResponsavelHandler{
		adicionar:    adicionar,
		atualizar:    atualizar,
		remover:      remover,
		setUniforme:  setUniforme,
		respRepo:     respRepo,
		uniformeRepo: uniformeRepo,
		atletaRepo:   atletaRepo,
	}
}

// ensureAcessoAoAtleta retorna true se o caller pode acessar o atleta;
// para perfil RESPONSAVEL exige IsAtletaDoResponsavel. Quando retorna false
// já gravou 404 na response — chamador deve apenas dar return.
func (h *ResponsavelHandler) ensureAcessoAoAtleta(w http.ResponseWriter, r *http.Request, atletaID uuid.UUID) bool {
	userID, perfil, _ := authContext(r.Context())
	if perfil != PerfilResponsavel {
		return true
	}
	ok, err := h.atletaRepo.IsAtletaDoResponsavel(r.Context(), atletaID, userID)
	if err != nil {
		response.WriteError(w, r, err)
		return false
	}
	if !ok {
		http.NotFound(w, r)
		return false
	}
	return true
}

// ─── POST /atletas/{id}/responsaveis ────────────────────────────────────────

func (h *ResponsavelHandler) Adicionar(w http.ResponseWriter, r *http.Request) {
	atletaID, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id do atleta inválido"})
		return
	}
	var body responsavelPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	out, err := h.adicionar.Execute(r.Context(), appatleta.AdicionarResponsavelInput{
		AtletaID:         atletaID,
		Nome:             strings.TrimSpace(body.Nome),
		Telefone:         strings.TrimSpace(body.Telefone),
		Parentesco:       domainatleta.Parentesco(body.Parentesco),
		CPF:              body.CPF,
		Email:            body.Email,
		ContatoPrincipal: body.ContatoPrincipal,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusCreated, toResponsavelResponse(out))
}

// ─── GET /atletas/{id}/responsaveis ─────────────────────────────────────────

func (h *ResponsavelHandler) ListPorAtleta(w http.ResponseWriter, r *http.Request) {
	atletaID, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id do atleta inválido"})
		return
	}
	if !h.ensureAcessoAoAtleta(w, r, atletaID) {
		return
	}
	rows, err := h.respRepo.ListByAtleta(r.Context(), atletaID)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	resp := make([]responsavelResponse, len(rows))
	for i, x := range rows {
		resp[i] = toResponsavelResponse(x)
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{"data": resp})
}

// ─── PUT /responsaveis/{id} ──────────────────────────────────────────────────

func (h *ResponsavelHandler) Atualizar(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	var body responsavelPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	out, err := h.atualizar.Execute(r.Context(), appatleta.AtualizarResponsavelInput{
		ID:               id,
		Nome:             strings.TrimSpace(body.Nome),
		Telefone:         strings.TrimSpace(body.Telefone),
		Parentesco:       domainatleta.Parentesco(body.Parentesco),
		CPF:              body.CPF,
		Email:            body.Email,
		ContatoPrincipal: body.ContatoPrincipal,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toResponsavelResponse(out))
}

// ─── DELETE /responsaveis/{id} ──────────────────────────────────────────────

func (h *ResponsavelHandler) Remover(w http.ResponseWriter, r *http.Request) {
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

// ─── PUT /atletas/{id}/uniforme ─────────────────────────────────────────────

func (h *ResponsavelHandler) SetUniforme(w http.ResponseWriter, r *http.Request) {
	atletaID, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id do atleta inválido"})
		return
	}
	var body uniformePayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	out, err := h.setUniforme.Execute(r.Context(), appatleta.SetUniformeInput{
		AtletaID:    atletaID,
		TamCamisa:   strings.TrimSpace(body.TamCamisa),
		TamShort:    strings.TrimSpace(body.TamShort),
		TamChuteira: strings.TrimSpace(body.TamChuteira),
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toUniformeResponse(out))
}

// ─── GET /atletas/{id}/uniforme ─────────────────────────────────────────────

func (h *ResponsavelHandler) GetUniforme(w http.ResponseWriter, r *http.Request) {
	atletaID, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id do atleta inválido"})
		return
	}
	if !h.ensureAcessoAoAtleta(w, r, atletaID) {
		return
	}
	u, err := h.uniformeRepo.GetByAtleta(r.Context(), atletaID)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	if u == nil {
		http.NotFound(w, r)
		return
	}
	response.WriteJSON(w, http.StatusOK, toUniformeResponse(u))
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

type responsavelPayload struct {
	Nome             string  `json:"nome"`
	Telefone         string  `json:"telefone"`
	Parentesco       string  `json:"parentesco"`
	CPF              *string `json:"cpf,omitempty"`
	Email            *string `json:"email,omitempty"`
	ContatoPrincipal bool    `json:"contato_principal"`
}

type responsavelResponse struct {
	ID               uuid.UUID `json:"id"`
	AtletaID         uuid.UUID `json:"atleta_id"`
	Nome             string    `json:"nome"`
	Telefone         string    `json:"telefone"`
	Parentesco       string    `json:"parentesco"`
	CPF              *string   `json:"cpf,omitempty"`
	Email            *string   `json:"email,omitempty"`
	ContatoPrincipal bool      `json:"contato_principal"`
	CriadoEm         time.Time `json:"criado_em"`
	AtualizadoEm     time.Time `json:"atualizado_em"`
}

func toResponsavelResponse(r *domainatleta.Responsavel) responsavelResponse {
	return responsavelResponse{
		ID:               r.ID,
		AtletaID:         r.AtletaID,
		Nome:             r.Nome,
		Telefone:         r.Telefone,
		Parentesco:       string(r.Parentesco),
		CPF:              r.CPF,
		Email:            r.Email,
		ContatoPrincipal: r.ContatoPrincipal,
		CriadoEm:         r.CriadoEm,
		AtualizadoEm:     r.AtualizadoEm,
	}
}

type uniformePayload struct {
	TamCamisa   string `json:"tam_camisa"`
	TamShort    string `json:"tam_short"`
	TamChuteira string `json:"tam_chuteira"`
}

type uniformeResponse struct {
	ID           uuid.UUID `json:"id"`
	AtletaID     uuid.UUID `json:"atleta_id"`
	TamCamisa    string    `json:"tam_camisa"`
	TamShort     string    `json:"tam_short"`
	TamChuteira  string    `json:"tam_chuteira"`
	AtualizadoEm time.Time `json:"atualizado_em"`
}

func toUniformeResponse(u *domainatleta.Uniforme) uniformeResponse {
	return uniformeResponse{
		ID:           u.ID,
		AtletaID:     u.AtletaID,
		TamCamisa:    u.TamCamisa,
		TamShort:     u.TamShort,
		TamChuteira:  u.TamChuteira,
		AtualizadoEm: u.AtualizadoEm,
	}
}
