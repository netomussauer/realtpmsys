package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	appatleta "github.com/realtpmsys/realtpmsys/internal/application/atleta"
	domainatleta "github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

type AtletaHandler struct {
	cadastrar   *appatleta.CadastrarAtletaUseCase
	atualizar   *appatleta.AtualizarAtletaUseCase
	mudarStatus *appatleta.MudarStatusAtletaUseCase
	remover     *appatleta.RemoverAtletaUseCase
	repo        domainatleta.Repository
}

func NewAtletaHandler(
	cadastrar *appatleta.CadastrarAtletaUseCase,
	atualizar *appatleta.AtualizarAtletaUseCase,
	mudarStatus *appatleta.MudarStatusAtletaUseCase,
	remover *appatleta.RemoverAtletaUseCase,
	repo domainatleta.Repository,
) *AtletaHandler {
	return &AtletaHandler{
		cadastrar:   cadastrar,
		atualizar:   atualizar,
		mudarStatus: mudarStatus,
		remover:     remover,
		repo:        repo,
	}
}

// ─── POST /atletas ───────────────────────────────────────────────────────────

func (h *AtletaHandler) Cadastrar(w http.ResponseWriter, r *http.Request) {
	var body atletaPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}

	dataNasc, err := parseISODate(body.DataNascimento)
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "data_nascimento inválida, use YYYY-MM-DD"})
		return
	}

	a, err := h.cadastrar.Execute(r.Context(), appatleta.CadastrarAtletaInput{
		Nome:           strings.TrimSpace(body.Nome),
		DataNascimento: dataNasc,
		CPF:            body.CPF,
		RG:             body.RG,
		Endereco:       body.Endereco,
		Cidade:         body.Cidade,
		UF:             body.UF,
		CEP:            body.CEP,
		Email:          body.Email,
		Telefone:       body.Telefone,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusCreated, toAtletaResponse(a))
}

// ─── GET /atletas ────────────────────────────────────────────────────────────

func (h *AtletaHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := domainatleta.ListFilter{
		Page:    parseInt(q.Get("page"), 1),
		PerPage: parseInt(q.Get("per_page"), 20),
		Nome:    strings.TrimSpace(q.Get("nome")),
	}
	if s := q.Get("status"); s != "" {
		st := domainatleta.Status(s)
		filter.Status = &st
	}

	atletas, total, err := h.repo.List(r.Context(), filter)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data": toAtletaResponses(atletas),
		"pagination": map[string]any{
			"total":    total,
			"page":     filter.Page,
			"per_page": filter.PerPage,
		},
	})
}

// ─── GET /atletas/{id} ───────────────────────────────────────────────────────

func (h *AtletaHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	a, err := h.repo.GetByID(r.Context(), id)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	if a == nil {
		http.NotFound(w, r)
		return
	}
	response.WriteJSON(w, http.StatusOK, toAtletaResponse(a))
}

// ─── PUT /atletas/{id} ───────────────────────────────────────────────────────

func (h *AtletaHandler) Atualizar(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	var body atletaPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	var dataNasc time.Time
	if body.DataNascimento != "" {
		dataNasc, err = parseISODate(body.DataNascimento)
		if err != nil {
			response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "data_nascimento inválida, use YYYY-MM-DD"})
			return
		}
	}

	a, err := h.atualizar.Execute(r.Context(), appatleta.AtualizarAtletaInput{
		ID:             id,
		Nome:           strings.TrimSpace(body.Nome),
		DataNascimento: dataNasc,
		CPF:            body.CPF,
		RG:             body.RG,
		Endereco:       body.Endereco,
		Cidade:         body.Cidade,
		UF:             body.UF,
		CEP:            body.CEP,
		Email:          body.Email,
		Telefone:       body.Telefone,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toAtletaResponse(a))
}

// ─── DELETE /atletas/{id} ────────────────────────────────────────────────────

func (h *AtletaHandler) Remover(w http.ResponseWriter, r *http.Request) {
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

// ─── PATCH /atletas/{id}/{acao} ──────────────────────────────────────────────

func (h *AtletaHandler) Inativar(w http.ResponseWriter, r *http.Request) {
	h.mudarStatusByAction(w, r, appatleta.AcaoInativar)
}

func (h *AtletaHandler) Suspender(w http.ResponseWriter, r *http.Request) {
	h.mudarStatusByAction(w, r, appatleta.AcaoSuspender)
}

func (h *AtletaHandler) Reativar(w http.ResponseWriter, r *http.Request) {
	h.mudarStatusByAction(w, r, appatleta.AcaoReativar)
}

func (h *AtletaHandler) mudarStatusByAction(w http.ResponseWriter, r *http.Request, acao appatleta.AcaoStatus) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	a, err := h.mudarStatus.Execute(r.Context(), id, acao)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toAtletaResponse(a))
}

// ─────────────────────────────────────────────────────────────────────────────
// DTO + helpers
// ─────────────────────────────────────────────────────────────────────────────

type atletaPayload struct {
	Nome           string  `json:"nome"`
	DataNascimento string  `json:"data_nascimento"`
	CPF            *string `json:"cpf,omitempty"`
	RG             *string `json:"rg,omitempty"`
	Endereco       *string `json:"endereco,omitempty"`
	Cidade         *string `json:"cidade,omitempty"`
	UF             *string `json:"uf,omitempty"`
	CEP            *string `json:"cep,omitempty"`
	Email          *string `json:"email,omitempty"`
	Telefone       *string `json:"telefone,omitempty"`
}

type atletaResponse struct {
	ID             uuid.UUID  `json:"id"`
	Nome           string     `json:"nome"`
	DataNascimento string     `json:"data_nascimento"`
	Idade          int        `json:"idade"`
	CPF            *string    `json:"cpf,omitempty"`
	RG             *string    `json:"rg,omitempty"`
	Endereco       *string    `json:"endereco,omitempty"`
	Cidade         *string    `json:"cidade,omitempty"`
	UF             *string    `json:"uf,omitempty"`
	CEP            *string    `json:"cep,omitempty"`
	Email          *string    `json:"email,omitempty"`
	Telefone       *string    `json:"telefone,omitempty"`
	Status         string     `json:"status"`
	CriadoEm       time.Time  `json:"criado_em"`
	AtualizadoEm   time.Time  `json:"atualizado_em"`
}

func toAtletaResponse(a *domainatleta.Atleta) atletaResponse {
	return atletaResponse{
		ID:             a.ID,
		Nome:           a.Nome,
		DataNascimento: a.DataNascimento.Format("2006-01-02"),
		Idade:          a.Idade(),
		CPF:            a.CPF,
		RG:             a.RG,
		Endereco:       a.Endereco,
		Cidade:         a.Cidade,
		UF:             a.UF,
		CEP:            a.CEP,
		Email:          a.Email,
		Telefone:       a.Telefone,
		Status:         string(a.Status),
		CriadoEm:       a.CriadoEm,
		AtualizadoEm:   a.AtualizadoEm,
	}
}

func toAtletaResponses(atletas []*domainatleta.Atleta) []atletaResponse {
	result := make([]atletaResponse, len(atletas))
	for i, a := range atletas {
		result[i] = toAtletaResponse(a)
	}
	return result
}

func parseISODate(s string) (time.Time, error) {
	return time.Parse("2006-01-02", s)
}

func parseInt(s string, fallback int) int {
	if s == "" {
		return fallback
	}
	n, err := strconv.Atoi(s)
	if err != nil || n < 1 {
		return fallback
	}
	return n
}
