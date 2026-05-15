package handler

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
	appturma "github.com/realtpmsys/realtpmsys/internal/application/turma"
	domainturma "github.com/realtpmsys/realtpmsys/internal/domain/turma"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

type TurmaHandler struct {
	criar         *appturma.CriarTurmaUseCase
	atualizar     *appturma.AtualizarTurmaUseCase
	mudarStatus   *appturma.MudarStatusTurmaUseCase
	matricular    *appturma.MatricularAtletaUseCase
	cancelarMatr  *appturma.CancelarMatriculaUseCase
	turmaRepo     domainturma.TurmaRepository
	matriculaRepo domainturma.MatriculaRepository
}

func NewTurmaHandler(
	criar *appturma.CriarTurmaUseCase,
	atualizar *appturma.AtualizarTurmaUseCase,
	mudarStatus *appturma.MudarStatusTurmaUseCase,
	matricular *appturma.MatricularAtletaUseCase,
	cancelarMatr *appturma.CancelarMatriculaUseCase,
	turmaRepo domainturma.TurmaRepository,
	matriculaRepo domainturma.MatriculaRepository,
) *TurmaHandler {
	return &TurmaHandler{
		criar:         criar,
		atualizar:     atualizar,
		mudarStatus:   mudarStatus,
		matricular:    matricular,
		cancelarMatr:  cancelarMatr,
		turmaRepo:     turmaRepo,
		matriculaRepo: matriculaRepo,
	}
}

// ─── POST /turmas ────────────────────────────────────────────────────────────

func (h *TurmaHandler) Criar(w http.ResponseWriter, r *http.Request) {
	var body turmaPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	t, err := h.criar.Execute(r.Context(), appturma.CriarTurmaInput{
		Nome:           strings.TrimSpace(body.Nome),
		FaixaEtariaMin: body.FaixaEtariaMin,
		FaixaEtariaMax: body.FaixaEtariaMax,
		CapacidadeMax:  body.CapacidadeMax,
		TreinadorID:    body.TreinadorID,
		CampoID:        body.CampoID,
		Horarios:       toHorarioInputs(body.Horarios),
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusCreated, toTurmaResponse(t))
}

// ─── GET /turmas ─────────────────────────────────────────────────────────────

func (h *TurmaHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := domainturma.TurmaListFilter{
		Page:    parseInt(q.Get("page"), 1),
		PerPage: parseInt(q.Get("per_page"), 20),
		Nome:    strings.TrimSpace(q.Get("nome")),
	}
	if s := q.Get("status"); s != "" {
		st := domainturma.Status(s)
		filter.Status = &st
	}
	turmas, total, err := h.turmaRepo.List(r.Context(), filter)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data": toTurmaResponses(turmas),
		"pagination": map[string]any{
			"total":    total,
			"page":     filter.Page,
			"per_page": filter.PerPage,
		},
	})
}

// ─── GET /turmas/{id} ────────────────────────────────────────────────────────

func (h *TurmaHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	t, err := h.turmaRepo.GetByID(r.Context(), id)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	if t == nil {
		http.NotFound(w, r)
		return
	}
	response.WriteJSON(w, http.StatusOK, toTurmaResponse(t))
}

// ─── PUT /turmas/{id} ────────────────────────────────────────────────────────

func (h *TurmaHandler) Atualizar(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	var body turmaPayload
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}
	t, err := h.atualizar.Execute(r.Context(), appturma.AtualizarTurmaInput{
		ID:             id,
		Nome:           strings.TrimSpace(body.Nome),
		FaixaEtariaMin: body.FaixaEtariaMin,
		FaixaEtariaMax: body.FaixaEtariaMax,
		CapacidadeMax:  body.CapacidadeMax,
		TreinadorID:    body.TreinadorID,
		CampoID:        body.CampoID,
		Horarios:       toHorarioInputs(body.Horarios),
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toTurmaResponse(t))
}

// ─── PATCH /turmas/{id}/{acao} ───────────────────────────────────────────────

func (h *TurmaHandler) Encerrar(w http.ResponseWriter, r *http.Request) {
	h.mudarStatusByAction(w, r, appturma.AcaoEncerrar)
}
func (h *TurmaHandler) Suspender(w http.ResponseWriter, r *http.Request) {
	h.mudarStatusByAction(w, r, appturma.AcaoSuspender)
}
func (h *TurmaHandler) Reativar(w http.ResponseWriter, r *http.Request) {
	h.mudarStatusByAction(w, r, appturma.AcaoReativar)
}

func (h *TurmaHandler) mudarStatusByAction(w http.ResponseWriter, r *http.Request, acao appturma.AcaoStatusTurma) {
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
	response.WriteJSON(w, http.StatusOK, toTurmaResponse(t))
}

// ─── POST /turmas/{id}/matriculas ────────────────────────────────────────────

func (h *TurmaHandler) Matricular(w http.ResponseWriter, r *http.Request) {
	turmaID, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	var body struct {
		AtletaID   string `json:"atleta_id"`
		DataInicio string `json:"data_inicio"`
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
	dataInicio, err := parseISODate(body.DataInicio)
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "data_inicio inválida, use YYYY-MM-DD"})
		return
	}
	m, err := h.matricular.Execute(r.Context(), appturma.MatricularAtletaInput{
		AtletaID:   atletaID,
		TurmaID:    turmaID,
		DataInicio: dataInicio,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusCreated, toMatriculaResponse(m))
}

// ─── GET /turmas/{id}/matriculas ─────────────────────────────────────────────

func (h *TurmaHandler) ListMatriculas(w http.ResponseWriter, r *http.Request) {
	turmaID, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	q := r.URL.Query()
	filter := domainturma.MatriculaListFilter{
		Page:    parseInt(q.Get("page"), 1),
		PerPage: parseInt(q.Get("per_page"), 20),
	}
	if s := q.Get("status"); s != "" {
		st := domainturma.StatusMatricula(s)
		filter.Status = &st
	}
	matriculas, total, err := h.matriculaRepo.ListPorTurma(r.Context(), turmaID, filter)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data": toMatriculaResponses(matriculas),
		"pagination": map[string]any{
			"total":    total,
			"page":     filter.Page,
			"per_page": filter.PerPage,
		},
	})
}

// ─── PATCH /matriculas/{id}/cancelar ─────────────────────────────────────────

func (h *TurmaHandler) CancelarMatricula(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	m, err := h.cancelarMatr.Execute(r.Context(), id)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toMatriculaResponse(m))
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs
// ─────────────────────────────────────────────────────────────────────────────

type horarioPayload struct {
	DiaSemana  string `json:"dia_semana"`
	HoraInicio string `json:"hora_inicio"`
	HoraFim    string `json:"hora_fim"`
}

type turmaPayload struct {
	Nome           string           `json:"nome"`
	FaixaEtariaMin int              `json:"faixa_etaria_min"`
	FaixaEtariaMax int              `json:"faixa_etaria_max"`
	CapacidadeMax  int              `json:"capacidade_max"`
	TreinadorID    *uuid.UUID       `json:"treinador_id,omitempty"`
	CampoID        *uuid.UUID       `json:"campo_id,omitempty"`
	Horarios       []horarioPayload `json:"horarios"`
}

type horarioResponse struct {
	ID         uuid.UUID `json:"id"`
	DiaSemana  string    `json:"dia_semana"`
	HoraInicio string    `json:"hora_inicio"`
	HoraFim    string    `json:"hora_fim"`
}

type turmaResponse struct {
	ID             uuid.UUID         `json:"id"`
	Nome           string            `json:"nome"`
	FaixaEtariaMin int               `json:"faixa_etaria_min"`
	FaixaEtariaMax int               `json:"faixa_etaria_max"`
	CapacidadeMax  int               `json:"capacidade_max"`
	TreinadorID    *uuid.UUID        `json:"treinador_id,omitempty"`
	CampoID        *uuid.UUID        `json:"campo_id,omitempty"`
	Status         string            `json:"status"`
	Horarios       []horarioResponse `json:"horarios"`
	CriadoEm       time.Time         `json:"criado_em"`
	AtualizadoEm   time.Time         `json:"atualizado_em"`
}

type matriculaResponse struct {
	ID         uuid.UUID `json:"id"`
	AtletaID   uuid.UUID `json:"atleta_id"`
	TurmaID    uuid.UUID `json:"turma_id"`
	DataInicio string    `json:"data_inicio"`
	DataFim    *string   `json:"data_fim,omitempty"`
	Status     string    `json:"status"`
}

func toHorarioInputs(payloads []horarioPayload) []appturma.HorarioInput {
	out := make([]appturma.HorarioInput, len(payloads))
	for i, p := range payloads {
		out[i] = appturma.HorarioInput{
			DiaSemana:  domainturma.DiaSemana(p.DiaSemana),
			HoraInicio: p.HoraInicio,
			HoraFim:    p.HoraFim,
		}
	}
	return out
}

func toTurmaResponse(t *domainturma.Turma) turmaResponse {
	hs := make([]horarioResponse, len(t.Horarios))
	for i, h := range t.Horarios {
		hs[i] = horarioResponse{
			ID:         h.ID,
			DiaSemana:  string(h.DiaSemana),
			HoraInicio: h.HoraInicio,
			HoraFim:    h.HoraFim,
		}
	}
	return turmaResponse{
		ID:             t.ID,
		Nome:           t.Nome,
		FaixaEtariaMin: t.FaixaEtariaMin,
		FaixaEtariaMax: t.FaixaEtariaMax,
		CapacidadeMax:  t.CapacidadeMax,
		TreinadorID:    t.TreinadorID,
		CampoID:        t.CampoID,
		Status:         string(t.Status),
		Horarios:       hs,
		CriadoEm:       t.CriadoEm,
		AtualizadoEm:   t.AtualizadoEm,
	}
}

func toTurmaResponses(ts []*domainturma.Turma) []turmaResponse {
	out := make([]turmaResponse, len(ts))
	for i, t := range ts {
		out[i] = toTurmaResponse(t)
	}
	return out
}

func toMatriculaResponse(m *domainturma.Matricula) matriculaResponse {
	resp := matriculaResponse{
		ID:         m.ID,
		AtletaID:   m.AtletaID,
		TurmaID:    m.TurmaID,
		DataInicio: m.DataInicio.Format("2006-01-02"),
		Status:     string(m.Status),
	}
	if m.DataFim != nil {
		s := m.DataFim.Format("2006-01-02")
		resp.DataFim = &s
	}
	return resp
}

func toMatriculaResponses(ms []*domainturma.Matricula) []matriculaResponse {
	out := make([]matriculaResponse, len(ms))
	for i, m := range ms {
		out[i] = toMatriculaResponse(m)
	}
	return out
}
