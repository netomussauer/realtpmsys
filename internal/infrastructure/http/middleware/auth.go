// Package middleware contém middlewares HTTP reutilizáveis.
package middleware

import (
	"context"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/response"
)

type contextKey string

const (
	ContextKeyUserID contextKey = "user_id"
	ContextKeyPerfil contextKey = "perfil"
)

// Claims define o payload do JWT. O campo Typ distingue access de refresh —
// só access pode acessar rotas /api/v1/*; refresh é aceito apenas em /auth/refresh.
type Claims struct {
	UserID string `json:"user_id"`
	Perfil string `json:"perfil"`
	Typ    string `json:"typ,omitempty"`
	jwt.RegisteredClaims
}

// Auth valida o Bearer access token JWT e injeta claims no contexto.
// Rejeita tokens com claim typ != "access" (refresh tokens não podem ser
// usados para autorizar chamadas a APIs protegidas).
func Auth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" || !strings.HasPrefix(header, "Bearer ") {
				response.WriteJSON(w, http.StatusUnauthorized, map[string]string{
					"error": "token ausente",
				})
				return
			}

			tokenStr := strings.TrimPrefix(header, "Bearer ")
			claims := &Claims{}

			token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (any, error) {
				if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
					return nil, jwt.ErrSignatureInvalid
				}
				return []byte(secret), nil
			})
			if err != nil || !token.Valid {
				response.WriteJSON(w, http.StatusUnauthorized, map[string]string{
					"error": "token inválido ou expirado",
				})
				return
			}

			// Tokens emitidos antes do refresh existir não têm claim `typ` —
			// aceitar como access por compatibilidade. Novos tokens sempre
			// trazem typ; refresh é rejeitado em rotas protegidas.
			if claims.Typ != "" && claims.Typ != "access" {
				response.WriteJSON(w, http.StatusUnauthorized, map[string]string{
					"error": "tipo de token inválido — use o access token, não o refresh",
				})
				return
			}

			ctx := context.WithValue(r.Context(), ContextKeyUserID, claims.UserID)
			ctx = context.WithValue(ctx, ContextKeyPerfil, claims.Perfil)

			// Se houver holder do Audit, enriquece o log com user_id/perfil.
			// `Audit` cria um novo *http.Request via WithContext e seu defer
			// não enxergaria o contexto modificado aqui sem este ponteiro.
			if info := auditAttrsFromContext(ctx); info != nil {
				info.UserID = claims.UserID
				info.Perfil = claims.Perfil
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequirePerfil verifica se o usuário possui um dos perfis permitidos.
func RequirePerfil(perfis ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]struct{}, len(perfis))
	for _, p := range perfis {
		allowed[p] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			perfil, _ := r.Context().Value(ContextKeyPerfil).(string)
			if _, ok := allowed[perfil]; !ok {
				response.WriteJSON(w, http.StatusForbidden, map[string]string{
					"error": "permissão insuficiente",
				})
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
