package handler

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	appidentidade "github.com/realtpmsys/realtpmsys/internal/application/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/ratelimit"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

// maxBodyBytes limita o corpo das requisições de gestão de contas.
const maxBodyBytes = 16 << 10

// UsuarioHandler expõe a gestão de contas (ADMIN) e a troca da própria senha.
type UsuarioHandler struct {
	criar        *appidentidade.CriarUsuarioUseCase
	atualizar    *appidentidade.AtualizarUsuarioUseCase
	status       *appidentidade.AlterarStatusUsuarioUseCase
	redefinir    *appidentidade.RedefinirSenhaUseCase
	alterarSenha *appidentidade.AlterarMinhaSenhaUseCase
	contas       identidade.ContaRepository
	// senhaLimiter freia tentativas de senha atual errada em /me/senha (oráculo
	// da senha para quem roubou um access token); nil desliga (testes).
	senhaLimiter *ratelimit.FailureLimiter
}

func NewUsuarioHandler(
	criar *appidentidade.CriarUsuarioUseCase,
	atualizar *appidentidade.AtualizarUsuarioUseCase,
	status *appidentidade.AlterarStatusUsuarioUseCase,
	redefinir *appidentidade.RedefinirSenhaUseCase,
	alterarSenha *appidentidade.AlterarMinhaSenhaUseCase,
	contas identidade.ContaRepository,
	senhaLimiter *ratelimit.FailureLimiter,
) *UsuarioHandler {
	return &UsuarioHandler{
		criar: criar, atualizar: atualizar, status: status,
		redefinir: redefinir, alterarSenha: alterarSenha, contas: contas, senhaLimiter: senhaLimiter,
	}
}

func decodeBody(w http.ResponseWriter, r *http.Request, dst any) bool {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return false
	}
	return true
}

// writeSenhaTemporaria responde com a senha em texto puro. no-store impede que
// proxies ou o navegador guardem a resposta em cache.
func writeSenhaTemporaria(w http.ResponseWriter, status int, body usuarioComSenhaResponse) {
	w.Header().Set("Cache-Control", "no-store")
	response.WriteJSON(w, status, body)
}

// ─── POST /usuarios ──────────────────────────────────────────────────────────

func (h *UsuarioHandler) Criar(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email  string `json:"email"`
		Nome   string `json:"nome"`
		Perfil string `json:"perfil"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	out, err := h.criar.Execute(r.Context(), appidentidade.CriarUsuarioInput{
		Email: body.Email, Nome: body.Nome, Perfil: body.Perfil,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	writeSenhaTemporaria(w, http.StatusCreated, usuarioComSenhaResponse{
		usuarioResponse: toUsuarioResponse(out.Usuario),
		SenhaTemporaria: out.SenhaTemporaria,
	})
}

// ─── GET /usuarios ───────────────────────────────────────────────────────────

func (h *UsuarioHandler) List(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	filter := identidade.ListFilter{
		Page:    parseInt(q.Get("page"), 1),
		PerPage: parseInt(q.Get("per_page"), 20),
		Busca:   strings.TrimSpace(q.Get("busca")),
	}
	if v := q.Get("perfil"); v != "" {
		p, err := identidade.ParsePerfil(v)
		if err != nil {
			response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "perfil inválido"})
			return
		}
		filter.Perfil = &p
	}
	if v := q.Get("ativo"); v != "" {
		b, err := strconv.ParseBool(v)
		if err != nil {
			response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "ativo inválido (use true/false)"})
			return
		}
		filter.Ativo = &b
	}

	rows, total, err := h.contas.List(r.Context(), filter)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	data := make([]usuarioResponse, len(rows))
	for i, u := range rows {
		data[i] = toUsuarioResponse(u)
	}
	response.WriteJSON(w, http.StatusOK, map[string]any{
		"data": data,
		"pagination": map[string]any{
			"total":    total,
			"page":     filter.Page,
			"per_page": filter.PerPage,
		},
	})
}

// ─── GET /usuarios/{id} ──────────────────────────────────────────────────────

func (h *UsuarioHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	u, err := h.contas.GetByID(r.Context(), id)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	if u == nil {
		http.NotFound(w, r)
		return
	}
	response.WriteJSON(w, http.StatusOK, toUsuarioResponse(u))
}

// ─── PUT /usuarios/{id} ──────────────────────────────────────────────────────

func (h *UsuarioHandler) Atualizar(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	atorID, _, ok := authContext(r.Context())
	if !ok {
		response.WriteJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	var body struct {
		Nome   *string `json:"nome"`
		Perfil *string `json:"perfil"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	u, err := h.atualizar.Execute(r.Context(), appidentidade.AtualizarUsuarioInput{
		ID: id, AtorID: atorID, Nome: body.Nome, Perfil: body.Perfil,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toUsuarioResponse(u))
}

// ─── PATCH /usuarios/{id}/ativar | /desativar ───────────────────────────────

func (h *UsuarioHandler) Ativar(w http.ResponseWriter, r *http.Request) { h.alterarStatus(w, r, true) }
func (h *UsuarioHandler) Desativar(w http.ResponseWriter, r *http.Request) {
	h.alterarStatus(w, r, false)
}

func (h *UsuarioHandler) alterarStatus(w http.ResponseWriter, r *http.Request, ativar bool) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	atorID, _, ok := authContext(r.Context())
	if !ok {
		response.WriteJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	u, err := h.status.Execute(r.Context(), id, atorID, ativar)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, toUsuarioResponse(u))
}

// ─── POST /usuarios/{id}/redefinir-senha ────────────────────────────────────

func (h *UsuarioHandler) RedefinirSenha(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUID(r, "id")
	if err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "id inválido"})
		return
	}
	atorID, _, ok := authContext(r.Context())
	if !ok {
		response.WriteJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	out, err := h.redefinir.Execute(r.Context(), id, atorID)
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	writeSenhaTemporaria(w, http.StatusOK, usuarioComSenhaResponse{
		usuarioResponse: toUsuarioResponse(out.Usuario),
		SenhaTemporaria: out.SenhaTemporaria,
	})
}

// ─── PATCH /me/senha ─────────────────────────────────────────────────────────

func (h *UsuarioHandler) AlterarMinhaSenha(w http.ResponseWriter, r *http.Request) {
	userID, _, ok := authContext(r.Context())
	if !ok {
		response.WriteJSON(w, http.StatusUnauthorized, map[string]string{"error": "não autenticado"})
		return
	}
	var body struct {
		SenhaAtual   string `json:"senha_atual"`
		NovaSenha    string `json:"nova_senha"`
		RefreshToken string `json:"refresh_token"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	if body.SenhaAtual == "" || body.NovaSenha == "" {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "senha_atual e nova_senha são obrigatórias"})
		return
	}
	chave := "senha:" + userID.String()
	if !permitirTentativa(w, r, h.senhaLimiter, chave) {
		return
	}
	err := h.alterarSenha.Execute(r.Context(), appidentidade.AlterarMinhaSenhaInput{
		UsuarioID:    userID,
		SenhaAtual:   body.SenhaAtual,
		NovaSenha:    body.NovaSenha,
		RefreshToken: body.RefreshToken,
	})
	if err != nil {
		// Só a senha atual incorreta consome a cota (é o que se tenta adivinhar);
		// senha nova fraca, conta inativa etc. a devolvem.
		if !errors.Is(err, shared.ErrSenhaAtualIncorreta) {
			h.senhaLimiter.Refund(chave)
		}
		response.WriteError(w, r, err)
		return
	}
	h.senhaLimiter.Reset(chave)
	w.WriteHeader(http.StatusNoContent)
}

// ─────────────────────────────────────────────────────────────────────────────
// DTOs — nunca expõem senha_hash.
// ─────────────────────────────────────────────────────────────────────────────

type usuarioResponse struct {
	ID              uuid.UUID `json:"id"`
	Email           string    `json:"email"`
	Nome            string    `json:"nome"`
	Perfil          string    `json:"perfil"`
	Ativo           bool      `json:"ativo"`
	DeveTrocarSenha bool      `json:"deve_trocar_senha"`
	CriadoEm        string    `json:"criado_em"`
	AtualizadoEm    string    `json:"atualizado_em"`
}

type usuarioComSenhaResponse struct {
	usuarioResponse
	SenhaTemporaria string `json:"senha_temporaria"`
}

func toUsuarioResponse(u *identidade.Usuario) usuarioResponse {
	return usuarioResponse{
		ID:              u.ID,
		Email:           u.Email,
		Nome:            u.Nome,
		Perfil:          string(u.Perfil),
		Ativo:           u.Ativo,
		DeveTrocarSenha: u.DeveTrocarSenha,
		CriadoEm:        u.CriadoEm.UTC().Format(time.RFC3339),
		AtualizadoEm:    u.AtualizadoEm.UTC().Format(time.RFC3339),
	}
}

// permitirTentativa consulta o limitador de falhas. Quando a chave está
// bloqueada responde 429 (RFC 7807 + Retry-After) e devolve false.
func permitirTentativa(w http.ResponseWriter, r *http.Request, l *ratelimit.FailureLimiter, key string) bool {
	ok, espera := l.Reserve(key)
	if ok {
		return true
	}
	segundos := int(espera.Seconds())
	if segundos < 1 {
		segundos = 1
	}
	w.Header().Set("Retry-After", strconv.Itoa(segundos))
	response.WriteJSON(w, http.StatusTooManyRequests, response.Problem{
		Type:     "https://realtpmsys.local/errors/too-many-attempts",
		Title:    "Muitas tentativas",
		Status:   http.StatusTooManyRequests,
		Detail:   "Muitas tentativas malsucedidas. Aguarde antes de tentar novamente.",
		Instance: r.URL.Path,
	})
	return false
}
