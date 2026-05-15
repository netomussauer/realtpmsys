package handler

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/google/uuid"
	appfinanceiro "github.com/realtpmsys/realtpmsys/internal/application/financeiro"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
	"github.com/shopspring/decimal"
)

// ContratoHandler expõe operações sobre contratos atleta-plano.
type ContratoHandler struct {
	firmar *appfinanceiro.FirmarContratoUseCase
}

func NewContratoHandler(firmar *appfinanceiro.FirmarContratoUseCase) *ContratoHandler {
	return &ContratoHandler{firmar: firmar}
}

// ─── POST /contratos ──────────────────────────────────────────────────────────

func (h *ContratoHandler) Firmar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		AtletaID        string  `json:"atleta_id"`
		PlanoID         string  `json:"plano_id"`
		DataInicio      string  `json:"data_inicio"`
		ValorContratado *string `json:"valor_contratado,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}

	atletaID, err := uuid.Parse(body.AtletaID)
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "atleta_id inválido"})
		return
	}
	planoID, err := uuid.Parse(body.PlanoID)
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "plano_id inválido"})
		return
	}
	dataInicio, err := time.Parse("2006-01-02", body.DataInicio)
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "data_inicio inválida, use YYYY-MM-DD"})
		return
	}

	input := appfinanceiro.FirmarContratoInput{
		AtletaID:   atletaID,
		PlanoID:    planoID,
		DataInicio: dataInicio,
	}
	if body.ValorContratado != nil {
		v, err := decimal.NewFromString(*body.ValorContratado)
		if err != nil {
			response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "valor_contratado inválido"})
			return
		}
		input.ValorContratado = &v
	}

	contrato, err := h.firmar.Execute(r.Context(), input)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusCreated, toContratoResponse(contrato))
}

type contratoResponse struct {
	ID              uuid.UUID `json:"id"`
	AtletaID        uuid.UUID `json:"atleta_id"`
	PlanoID         uuid.UUID `json:"plano_id"`
	DataInicio      string    `json:"data_inicio"`
	DataFim         *string   `json:"data_fim,omitempty"`
	ValorContratado string    `json:"valor_contratado"`
	Status          string    `json:"status"`
}

func toContratoResponse(c *financeiro.Contrato) contratoResponse {
	resp := contratoResponse{
		ID:              c.ID,
		AtletaID:        c.AtletaID,
		PlanoID:         c.PlanoID,
		DataInicio:      c.DataInicio.Format("2006-01-02"),
		ValorContratado: c.ValorContratado.String(),
		Status:          string(c.Status),
	}
	if c.DataFim != nil {
		s := c.DataFim.Format("2006-01-02")
		resp.DataFim = &s
	}
	return resp
}
