package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	appplano "github.com/realtpmsys/realtpmsys/internal/application/plano"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
	"github.com/shopspring/decimal"
)

// PlanoHandler expõe as operações do contexto Financeiro sobre Plano.
type PlanoHandler struct {
	criar  *appplano.CriarPlanoUseCase
	planos financeiro.PlanoRepository
}

func NewPlanoHandler(criar *appplano.CriarPlanoUseCase, planos financeiro.PlanoRepository) *PlanoHandler {
	return &PlanoHandler{criar: criar, planos: planos}
}

// ─── POST /planos ─────────────────────────────────────────────────────────────

func (h *PlanoHandler) Criar(w http.ResponseWriter, r *http.Request) {
	var body planoPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}

	valor, err := decimal.NewFromString(body.ValorMensal)
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "valor_mensal inválido"})
		return
	}

	p, err := h.criar.Execute(r.Context(), appplano.CriarPlanoInput{
		Nome:          strings.TrimSpace(body.Nome),
		DiasSemana:    body.DiasSemana,
		ValorMensal:   valor,
		DiaVencimento: body.DiaVencimento,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusCreated, toPlanoResponse(p))
}

// ─── GET /planos ──────────────────────────────────────────────────────────────
//
// Lista apenas planos ativos — não há paginação/filtro no contrato OpenAPI
// (mesmo comportamento de financeiro.PlanoRepository.ListAtivos, já usado
// internamente por FirmarContratoUseCase/GerarMensalidadesUseCase).

func (h *PlanoHandler) List(w http.ResponseWriter, r *http.Request) {
	rows, err := h.planos.ListAtivos(r.Context())
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data": toPlanoResponses(rows),
	})
}

// ─── GET /planos/{id} ─────────────────────────────────────────────────────────

func (h *PlanoHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	p, err := h.planos.GetByID(r.Context(), id)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	if p == nil {
		http.NotFound(w, r)
		return
	}
	response.WriteJSON(w, http.StatusOK, toPlanoResponse(p))
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

type planoPayload struct {
	Nome          string `json:"nome"`
	DiasSemana    int    `json:"dias_semana"`
	ValorMensal   string `json:"valor_mensal"`
	DiaVencimento int    `json:"dia_vencimento"`
}

type planoResponse struct {
	ID            uuid.UUID `json:"id"`
	Nome          string    `json:"nome"`
	DiasSemana    int       `json:"dias_semana"`
	ValorMensal   string    `json:"valor_mensal"`
	DiaVencimento int       `json:"dia_vencimento"`
	Ativo         bool      `json:"ativo"`
}

func toPlanoResponse(p *financeiro.Plano) planoResponse {
	return planoResponse{
		ID:            p.ID,
		Nome:          p.Nome,
		DiasSemana:    p.DiasSemana,
		ValorMensal:   p.ValorMensal.String(),
		DiaVencimento: p.DiaVencimento,
		Ativo:         p.Ativo,
	}
}

func toPlanoResponses(ps []*financeiro.Plano) []planoResponse {
	out := make([]planoResponse, len(ps))
	for i, p := range ps {
		out[i] = toPlanoResponse(p)
	}
	return out
}
