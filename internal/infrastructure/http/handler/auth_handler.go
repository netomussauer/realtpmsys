package handler

import (
	"errors"
	"net/http"
	"strings"

	"github.com/google/uuid"
	appidentidade "github.com/realtpmsys/realtpmsys/internal/application/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/ratelimit"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

// AuthHandler expõe os endpoints de autenticação.
type AuthHandler struct {
	login   *appidentidade.LoginUseCase
	refresh *appidentidade.RefreshTokenUseCase
	logout  *appidentidade.LogoutUseCase
	// loginLimiter freia força bruta por e-mail; nil desliga (testes).
	loginLimiter *ratelimit.FailureLimiter
}

func NewAuthHandler(login *appidentidade.LoginUseCase, refresh *appidentidade.RefreshTokenUseCase, logout *appidentidade.LogoutUseCase, loginLimiter *ratelimit.FailureLimiter) *AuthHandler {
	return &AuthHandler{login: login, refresh: refresh, logout: logout, loginLimiter: loginLimiter}
}

// ─── POST /auth/login ────────────────────────────────────────────────────────

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Senha string `json:"senha"`
	}
	if !decodeBody(w, r, &body) {
		return
	}

	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	if body.Email == "" || body.Senha == "" {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "email e senha são obrigatórios"})
		return
	}

	// Freio de força bruta: bloqueia o e-mail após falhas repetidas (a chave é
	// o e-mail digitado, exista a conta ou não — não vaza se ela existe).
	if !permitirTentativa(w, r, h.loginLimiter, body.Email) {
		return
	}

	out, err := h.login.Execute(r.Context(), appidentidade.LoginInput{
		Email: body.Email,
		Senha: body.Senha,
	})
	if err != nil {
		if errors.Is(err, shared.ErrCredenciaisInvalidas) {
			h.loginLimiter.Fail(body.Email)
		}
		response.WriteError(w, r, err)
		return
	}
	h.loginLimiter.Reset(body.Email)

	response.WriteJSON(w, http.StatusOK, loginResponse{
		AccessToken:      out.AccessToken,
		RefreshToken:     out.RefreshToken,
		TokenType:        "Bearer",
		ExpiresAt:        out.AccessExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
		RefreshExpiresAt: out.RefreshExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
		UserID:           out.UserID,
		Perfil:           string(out.Perfil),
		DeveTrocarSenha:  out.DeveTrocarSenha,
	})
}

// ─── POST /auth/refresh ──────────────────────────────────────────────────────

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	if strings.TrimSpace(body.RefreshToken) == "" {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "refresh_token é obrigatório"})
		return
	}

	out, err := h.refresh.Execute(r.Context(), appidentidade.RefreshTokenInput{
		RefreshToken: body.RefreshToken,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}
	response.WriteJSON(w, http.StatusOK, refreshResponse{
		AccessToken:      out.AccessToken,
		RefreshToken:     out.RefreshToken,
		TokenType:        "Bearer",
		ExpiresAt:        out.AccessExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
		RefreshExpiresAt: out.RefreshExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
		UserID:           out.UserID,
		Perfil:           string(out.Perfil),
		DeveTrocarSenha:  out.DeveTrocarSenha,
	})
}

// ─── POST /auth/logout ───────────────────────────────────────────────────────

// Logout revoga a sessão (família do refresh token). Público: quem tem o
// refresh token pode encerrá-lo, e a resposta não revela se ele existia.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	var body struct {
		RefreshToken string `json:"refresh_token"`
	}
	if !decodeBody(w, r, &body) {
		return
	}
	if err := h.logout.Execute(r.Context(), strings.TrimSpace(body.RefreshToken)); err != nil {
		response.WriteError(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// ─────────────────────────────────────────────────────────────────────────────

type loginResponse struct {
	AccessToken      string    `json:"access_token"`
	RefreshToken     string    `json:"refresh_token"`
	TokenType        string    `json:"token_type"`
	ExpiresAt        string    `json:"expires_at"`
	RefreshExpiresAt string    `json:"refresh_expires_at"`
	UserID           uuid.UUID `json:"user_id"`
	Perfil           string    `json:"perfil"`
	DeveTrocarSenha  bool      `json:"deve_trocar_senha"`
}

type refreshResponse struct {
	AccessToken      string    `json:"access_token"`
	RefreshToken     string    `json:"refresh_token"`
	TokenType        string    `json:"token_type"`
	ExpiresAt        string    `json:"expires_at"`
	RefreshExpiresAt string    `json:"refresh_expires_at"`
	UserID           uuid.UUID `json:"user_id"`
	Perfil           string    `json:"perfil"`
	DeveTrocarSenha  bool      `json:"deve_trocar_senha"`
}
