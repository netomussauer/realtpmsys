package handler

import (
	"net/http"
	"strconv"
	"time"

	apprel "github.com/realtpmsys/realtpmsys/internal/application/relatorio"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

type RelatorioHandler struct {
	svc *apprel.Service
}

func NewRelatorioHandler(svc *apprel.Service) *RelatorioHandler {
	return &RelatorioHandler{svc: svc}
}

// ─── GET /relatorios/inadimplencia?competencia_ano=&competencia_mes= ────────

func (h *RelatorioHandler) Inadimplencia(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	var ano, mes *int
	if v := q.Get("competencia_ano"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil {
			response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "competencia_ano inválido"})
			return
		}
		ano = &n
	}
	if v := q.Get("competencia_mes"); v != "" {
		n, err := strconv.Atoi(v)
		if err != nil || n < 1 || n > 12 {
			response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "competencia_mes inválido (1..12)"})
			return
		}
		mes = &n
	}

	rel, err := h.svc.Inadimplencia(r.Context(), ano, mes)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}

	itens := make([]map[string]any, len(rel.Itens))
	for i, it := range rel.Itens {
		itens[i] = map[string]any{
			"mensalidade_id":   it.MensalidadeID,
			"atleta_id":        it.AtletaID,
			"atleta_nome":      it.AtletaNome,
			"atleta_telefone":  it.AtletaTelefone,
			"atleta_email":     it.AtletaEmail,
			"competencia_ano":  it.CompetenciaAno,
			"competencia_mes":  it.CompetenciaMes,
			"data_vencimento":  it.DataVencimento.Format("2006-01-02"),
			"valor":            it.Valor.String(),
			"status":           it.Status,
			"dias_em_atraso":   it.DiasEmAtraso,
		}
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data": itens,
		"resumo": map[string]any{
			"total_mensalidades": rel.Resumo.TotalMensalidades,
			"total_atletas":      rel.Resumo.TotalAtletas,
			"total_devido":       rel.Resumo.TotalDevido.String(),
		},
	})
}

// ─── GET /relatorios/frequencia/{atleta_id}?data_inicio=&data_fim= ──────────

func (h *RelatorioHandler) FrequenciaAtleta(w http.ResponseWriter, r *http.Request) {
	atletaID, err := parseUUID(r, "atleta_id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "atleta_id inválido"})
		return
	}
	di, df, perr := parsePeriodo(r)
	if perr != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": perr.Error()})
		return
	}
	freq, err := h.svc.FrequenciaAtleta(r.Context(), atletaID, di, df)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"atleta_id":         atletaID,
		"data_inicio":       di.Format("2006-01-02"),
		"data_fim":          df.Format("2006-01-02"),
		"presentes":         freq.Presentes,
		"ausentes":          freq.Ausentes,
		"justificados":      freq.Justificados,
		"total":             freq.Total,
		"taxa_presenca_pc":  freq.TaxaPresencaPC,
	})
}

// ─── GET /relatorios/frequencia/turma/{turma_id}?data_inicio=&data_fim= ────

func (h *RelatorioHandler) FrequenciaTurma(w http.ResponseWriter, r *http.Request) {
	turmaID, err := parseUUID(r, "turma_id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "turma_id inválido"})
		return
	}
	di, df, perr := parsePeriodo(r)
	if perr != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": perr.Error()})
		return
	}
	rel, err := h.svc.FrequenciaTurma(r.Context(), turmaID, di, df)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	itens := make([]map[string]any, len(rel.Itens))
	for i, it := range rel.Itens {
		itens[i] = map[string]any{
			"atleta_id":        it.AtletaID,
			"atleta_nome":      it.AtletaNome,
			"presentes":        it.Presentes,
			"ausentes":         it.Ausentes,
			"justificados":     it.Justificados,
			"total":            it.Total,
			"taxa_presenca_pc": it.TaxaPresencaPC,
		}
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"turma_id":      rel.TurmaID,
		"data_inicio":   di.Format("2006-01-02"),
		"data_fim":      df.Format("2006-01-02"),
		"total_treinos": rel.TotalTreinos,
		"data":          itens,
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

func parsePeriodo(r *http.Request) (time.Time, time.Time, error) {
	q := r.URL.Query()
	di, err := time.Parse("2006-01-02", q.Get("data_inicio"))
	if err != nil {
		return time.Time{}, time.Time{}, errStr("data_inicio inválida, use YYYY-MM-DD")
	}
	df, err := time.Parse("2006-01-02", q.Get("data_fim"))
	if err != nil {
		return time.Time{}, time.Time{}, errStr("data_fim inválida, use YYYY-MM-DD")
	}
	if df.Before(di) {
		return time.Time{}, time.Time{}, errStr("data_fim deve ser >= data_inicio")
	}
	return di, df, nil
}

type errStr string

func (e errStr) Error() string { return string(e) }
