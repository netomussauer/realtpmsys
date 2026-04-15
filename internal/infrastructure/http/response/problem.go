// Package response padroniza respostas HTTP seguindo RFC 7807 (Problem Details).
package response

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// Problem representa um erro HTTP no formato RFC 7807.
type Problem struct {
	Type     string `json:"type"`
	Title    string `json:"title"`
	Status   int    `json:"status"`
	Detail   string `json:"detail"`
	Instance string `json:"instance,omitempty"`
}

const baseURL = "https://realtpmsys.local/errors"

// WriteError mapeia erros de domínio para respostas HTTP padronizadas.
func WriteError(w http.ResponseWriter, r *http.Request, err error) {
	var p Problem
	switch {
	case errors.Is(err, shared.ErrNotFound):
		p = Problem{
			Type:     baseURL + "/not-found",
			Title:    "Recurso não encontrado",
			Status:   http.StatusNotFound,
			Detail:   err.Error(),
			Instance: r.URL.Path,
		}
	case errors.Is(err, shared.ErrConflict),
		errors.Is(err, shared.ErrContratoAtivoExistente),
		errors.Is(err, shared.ErrMensalidadeJaPaga),
		errors.Is(err, shared.ErrAtletaJaMatriculado):
		p = Problem{
			Type:     baseURL + "/conflict",
			Title:    "Conflito de estado",
			Status:   http.StatusConflict,
			Detail:   err.Error(),
			Instance: r.URL.Path,
		}
	case errors.Is(err, shared.ErrDomainViolation),
		errors.Is(err, shared.ErrDiasSemanasInvalido),
		errors.Is(err, shared.ErrValorInvalido),
		errors.Is(err, shared.ErrCPFInvalido):
		p = Problem{
			Type:     baseURL + "/domain-error",
			Title:    "Regra de negócio violada",
			Status:   http.StatusUnprocessableEntity,
			Detail:   err.Error(),
			Instance: r.URL.Path,
		}
	default:
		p = Problem{
			Type:     baseURL + "/internal-error",
			Title:    "Erro interno",
			Status:   http.StatusInternalServerError,
			Detail:   "Erro inesperado. Tente novamente.",
			Instance: r.URL.Path,
		}
	}
	WriteJSON(w, p.Status, p)
}

// WriteJSON serializa v como JSON com o status informado.
func WriteJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
