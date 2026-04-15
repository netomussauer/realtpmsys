// Package handler contém os HTTP handlers — interface entre HTTP e use cases.
package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	appfinanceiro "github.com/realtpmsys/realtpmsys/internal/application/financeiro"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
	"github.com/shopspring/decimal"
)

// MensalidadeHandler agrupa os handlers do contexto Financeiro.
type MensalidadeHandler struct {
	registrarPagamento  *appfinanceiro.RegistrarPagamentoUseCase
	cancelar            *appfinanceiro.CancelarMensalidadeUseCase
	gerarMensalidades   *appfinanceiro.GerarMensalidadesUseCase
	mensalidadeRepo     financeiro.MensalidadeRepository
}

func NewMensalidadeHandler(
	registrar *appfinanceiro.RegistrarPagamentoUseCase,
	cancelar *appfinanceiro.CancelarMensalidadeUseCase,
	gerar *appfinanceiro.GerarMensalidadesUseCase,
	repo financeiro.MensalidadeRepository,
) *MensalidadeHandler {
	return &MensalidadeHandler{
		registrarPagamento: registrar,
		cancelar:           cancelar,
		gerarMensalidades:  gerar,
		mensalidadeRepo:    repo,
	}
}

// ─── GET /mensalidades ────────────────────────────────────────────────────────

func (h *MensalidadeHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := financeiro.MensalidadeFilter{Page: 1, PerPage: 20}

	if v := q.Get("atleta_id"); v != "" {
		id, err := uuid.Parse(v)
		if err != nil {
			response.WriteError(w, r, err)
			return
		}
		filter.AtletaID = &id
	}
	if v := q.Get("status"); v != "" {
		s := financeiro.StatusMensalidade(v)
		filter.Status = &s
	}

	mensalidades, total, err := h.mensalidadeRepo.List(r.Context(), filter)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}

	resumo := financeiro.CalcularResumo(mensalidades)
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data":       toMensalidadeResponses(mensalidades),
		"pagination": map[string]any{"total": total, "page": filter.Page, "per_page": filter.PerPage},
		"resumo": map[string]any{
			"total_pendente": resumo.TotalPendente,
			"total_vencido":  resumo.TotalVencido,
			"total_pago":     resumo.TotalPago,
		},
	})
}

// ─── GET /mensalidades/{id} ───────────────────────────────────────────────────

func (h *MensalidadeHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	m, err := h.mensalidadeRepo.GetByID(r.Context(), id)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	if m == nil {
		http.NotFound(w, r)
		return
	}
	response.WriteJSON(w, http.StatusOK, toMensalidadeResponse(m))
}

// ─── PATCH /mensalidades/{id}/pagar ──────────────────────────────────────────

func (h *MensalidadeHandler) Pagar(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteError(w, r, err)
		return
	}

	var body struct {
		ValorPago      string  `json:"valor_pago"`
		DataPagamento  string  `json:"data_pagamento"`
		FormaPagamento string  `json:"forma_pagamento"`
		Observacao     *string `json:"observacao"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}

	valor, err := decimal.NewFromString(body.ValorPago)
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "valor_pago inválido"})
		return
	}
	data, err := time.Parse("2006-01-02", body.DataPagamento)
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "data_pagamento inválida, use YYYY-MM-DD"})
		return
	}

	m, err := h.registrarPagamento.Execute(r.Context(), appfinanceiro.RegistrarPagamentoInput{
		MensalidadeID:  id,
		ValorPago:      valor,
		DataPagamento:  data,
		FormaPagamento: body.FormaPagamento,
		Observacao:     body.Observacao,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toMensalidadeResponse(m))
}

// ─── PATCH /mensalidades/{id}/cancelar ───────────────────────────────────────

func (h *MensalidadeHandler) Cancelar(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	m, err := h.cancelar.Execute(r.Context(), id)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toMensalidadeResponse(m))
}

// ─── POST /mensalidades/gerar ─────────────────────────────────────────────────

func (h *MensalidadeHandler) Gerar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		CompetenciaAno int `json:"competencia_ano"`
		CompetenciaMes int `json:"competencia_mes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}

	result, err := h.gerarMensalidades.Execute(r.Context(), appfinanceiro.GerarMensalidadesInput{
		CompetenciaAno: body.CompetenciaAno,
		CompetenciaMes: body.CompetenciaMes,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"geradas":   result.Geradas,
		"ignoradas": result.Ignoradas,
		"com_erro":  result.ComErro,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

func parseUUID(r *http.Request, param string) (uuid.UUID, error) {
	return uuid.Parse(chi.URLParam(r, param))
}

type mensalidadeResponse struct {
	ID             uuid.UUID  `json:"id"`
	AtletaID       uuid.UUID  `json:"atleta_id"`
	CompetenciaAno int        `json:"competencia_ano"`
	CompetenciaMes int        `json:"competencia_mes"`
	DataVencimento string     `json:"data_vencimento"`
	Valor          string     `json:"valor"`
	ValorPago      *string    `json:"valor_pago,omitempty"`
	Status         string     `json:"status"`
	DataPagamento  *string    `json:"data_pagamento,omitempty"`
	FormaPagamento *string    `json:"forma_pagamento,omitempty"`
}

func toMensalidadeResponse(m *financeiro.Mensalidade) mensalidadeResponse {
	resp := mensalidadeResponse{
		ID:             m.ID,
		AtletaID:       m.AtletaID,
		CompetenciaAno: m.CompetenciaAno,
		CompetenciaMes: m.CompetenciaMes,
		DataVencimento: m.DataVencimento.Format("2006-01-02"),
		Valor:          m.Valor.String(),
		Status:         string(m.Status),
		FormaPagamento: m.FormaPagamento,
	}
	if m.ValorPago != nil {
		s := m.ValorPago.String()
		resp.ValorPago = &s
	}
	if m.DataPagamento != nil {
		s := m.DataPagamento.Format("2006-01-02")
		resp.DataPagamento = &s
	}
	return resp
}

func toMensalidadeResponses(ms []*financeiro.Mensalidade) []mensalidadeResponse {
	result := make([]mensalidadeResponse, len(ms))
	for i, m := range ms {
		result[i] = toMensalidadeResponse(m)
	}
	return result
}
