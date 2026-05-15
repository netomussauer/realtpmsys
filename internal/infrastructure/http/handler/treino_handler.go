package handler

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/google/uuid"
	appfreq "github.com/realtpmsys/realtpmsys/internal/application/frequencia"
	domfreq "github.com/realtpmsys/realtpmsys/internal/domain/frequencia"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

type TreinoHandler struct {
	criar        *appfreq.CriarTreinoUseCase
	lancar       *appfreq.LancarFrequenciaUseCase
	treinoRepo   domfreq.TreinoRepository
	frequenciaRepo domfreq.FrequenciaRepository
}

func NewTreinoHandler(
	criar *appfreq.CriarTreinoUseCase,
	lancar *appfreq.LancarFrequenciaUseCase,
	treinoRepo domfreq.TreinoRepository,
	frequenciaRepo domfreq.FrequenciaRepository,
) *TreinoHandler {
	return &TreinoHandler{
		criar:          criar,
		lancar:         lancar,
		treinoRepo:     treinoRepo,
		frequenciaRepo: frequenciaRepo,
	}
}

// ─── POST /turmas/{id}/treinos ───────────────────────────────────────────────

func (h *TreinoHandler) Criar(w http.ResponseWriter, r *http.Request) {
	turmaID, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id da turma inválido"})
		return
	}
	var body struct {
		DataTreino string  `json:"data_treino"`
		HoraInicio string  `json:"hora_inicio,omitempty"`
		HoraFim    string  `json:"hora_fim,omitempty"`
		Observacao *string `json:"observacao,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	data, err := parseISODate(body.DataTreino)
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "data_treino inválida, use YYYY-MM-DD"})
		return
	}
	t, err := h.criar.Execute(r.Context(), appfreq.CriarTreinoInput{
		TurmaID:    turmaID,
		DataTreino: data,
		HoraInicio: body.HoraInicio,
		HoraFim:    body.HoraFim,
		Observacao: body.Observacao,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusCreated, toTreinoResponse(t))
}

// ─── GET /turmas/{id}/treinos ────────────────────────────────────────────────

func (h *TreinoHandler) ListPorTurma(w http.ResponseWriter, r *http.Request) {
	turmaID, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id da turma inválido"})
		return
	}
	q := r.URL.Query()
	filter := domfreq.TreinoListFilter{
		Page:    parseInt(q.Get("page"), 1),
		PerPage: parseInt(q.Get("per_page"), 30),
	}
	if di := q.Get("data_inicio"); di != "" {
		d, err := parseISODate(di)
		if err != nil {
			response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "data_inicio inválida"})
			return
		}
		filter.DataInicio = &d
	}
	if df := q.Get("data_fim"); df != "" {
		d, err := parseISODate(df)
		if err != nil {
			response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "data_fim inválida"})
			return
		}
		filter.DataFim = &d
	}

	treinos, total, err := h.treinoRepo.ListPorTurma(r.Context(), turmaID, filter)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data": toTreinoResponses(treinos),
		"pagination": map[string]any{
			"total":    total,
			"page":     filter.Page,
			"per_page": filter.PerPage,
		},
	})
}

// ─── POST /treinos/{id}/frequencias ──────────────────────────────────────────

func (h *TreinoHandler) LancarFrequencias(w http.ResponseWriter, r *http.Request) {
	treinoID, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id do treino inválido"})
		return
	}
	var body struct {
		Registros []struct {
			AtletaID      string  `json:"atleta_id"`
			Presenca      string  `json:"presenca"`
			Justificativa *string `json:"justificativa,omitempty"`
		} `json:"registros"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	regs := make([]appfreq.PresencaInput, 0, len(body.Registros))
	for i, reg := range body.Registros {
		atletaID, err := uuid.Parse(reg.AtletaID)
		if err != nil {
			response.WriteJSON(w, http.StatusBadRequest, map[string]string{
				"error": "atleta_id inválido na posição " + strconv.Itoa(i),
			})
			return
		}
		regs = append(regs, appfreq.PresencaInput{
			AtletaID:      atletaID,
			Presenca:      domfreq.Presenca(reg.Presenca),
			Justificativa: reg.Justificativa,
		})
	}
	result, err := h.lancar.Execute(r.Context(), appfreq.LancarFrequenciaInput{
		TreinoID:  treinoID,
		Registros: regs,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"treino_id": treinoID,
		"total":     result.Total,
	})
}

// ─── GET /treinos/{id}/frequencias ───────────────────────────────────────────

func (h *TreinoHandler) ListFrequencias(w http.ResponseWriter, r *http.Request) {
	treinoID, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id do treino inválido"})
		return
	}
	frequencias, err := h.frequenciaRepo.ListPorTreino(r.Context(), treinoID)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data": toFrequenciaResponses(frequencias),
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

type treinoResponse struct {
	ID         uuid.UUID `json:"id"`
	TurmaID    uuid.UUID `json:"turma_id"`
	DataTreino string    `json:"data_treino"`
	HoraInicio string    `json:"hora_inicio,omitempty"`
	HoraFim    string    `json:"hora_fim,omitempty"`
	Observacao *string   `json:"observacao,omitempty"`
	CriadoEm   time.Time `json:"criado_em"`
}

type frequenciaResponse struct {
	ID            uuid.UUID `json:"id"`
	TreinoID      uuid.UUID `json:"treino_id"`
	AtletaID      uuid.UUID `json:"atleta_id"`
	Presenca      string    `json:"presenca"`
	Justificativa *string   `json:"justificativa,omitempty"`
	RegistradoEm  time.Time `json:"registrado_em"`
}

func toTreinoResponse(t *domfreq.Treino) treinoResponse {
	return treinoResponse{
		ID:         t.ID,
		TurmaID:    t.TurmaID,
		DataTreino: t.DataTreino.Format("2006-01-02"),
		HoraInicio: t.HoraInicio,
		HoraFim:    t.HoraFim,
		Observacao: t.Observacao,
		CriadoEm:   t.CriadoEm,
	}
}

func toTreinoResponses(ts []*domfreq.Treino) []treinoResponse {
	out := make([]treinoResponse, len(ts))
	for i, t := range ts {
		out[i] = toTreinoResponse(t)
	}
	return out
}

func toFrequenciaResponses(fs []*domfreq.Frequencia) []frequenciaResponse {
	out := make([]frequenciaResponse, len(fs))
	for i, f := range fs {
		out[i] = frequenciaResponse{
			ID:            f.ID,
			TreinoID:      f.TreinoID,
			AtletaID:      f.AtletaID,
			Presenca:      string(f.Presenca),
			Justificativa: f.Justificativa,
			RegistradoEm:  f.RegistradoEm,
		}
	}
	return out
}
