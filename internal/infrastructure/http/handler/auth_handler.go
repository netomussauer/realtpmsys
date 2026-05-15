package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	appidentidade "github.com/realtpmsys/realtpmsys/internal/application/identidade"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

// AuthHandler expõe os endpoints de autenticação.
type AuthHandler struct {
	login *appidentidade.LoginUseCase
}

func NewAuthHandler(login *appidentidade.LoginUseCase) *AuthHandler {
	return &AuthHandler{login: login}
}

// ─── POST /auth/login ────────────────────────────────────────────────────────

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
		Senha string `json:"senha"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "payload inválido"})
		return
	}

	body.Email = strings.TrimSpace(strings.ToLower(body.Email))
	if body.Email == "" || body.Senha == "" {
		response.WriteJSON(w, http.StatusBadRequest, map[string]string{"error": "email e senha são obrigatórios"})
		return
	}

	out, err := h.login.Execute(r.Context(), appidentidade.LoginInput{
		Email: body.Email,
		Senha: body.Senha,
	})
	if err != nil {
		response.WriteError(w, r, err)
		return
	}

	response.WriteJSON(w, http.StatusOK, loginResponse{
		AccessToken: out.AccessToken,
		TokenType:   "Bearer",
		ExpiresAt:   out.ExpiresAt.UTC().Format("2006-01-02T15:04:05Z"),
		UserID:      out.UserID,
		Perfil:      string(out.Perfil),
	})
}

type loginResponse struct {
	AccessToken string    `json:"access_token"`
	TokenType   string    `json:"token_type"`
	ExpiresAt   string    `json:"expires_at"`
	UserID      uuid.UUID `json:"user_id"`
	Perfil      string    `json:"perfil"`
}
