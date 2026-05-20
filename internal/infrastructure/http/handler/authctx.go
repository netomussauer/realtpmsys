package handler

import (
	"context"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/middleware"
)

// PerfilResponsavel é o valor do claim quando o usuário é o responsável de
// um ou mais atletas. Definido aqui pra evitar import do pacote `domain`
// na camada HTTP (que já depende do middleware).
const PerfilResponsavel = "RESPONSAVEL"

// authContext extrai user_id (UUID) e perfil setados pelo middleware Auth.
// Retorna ok=false se a rota não estava protegida por Auth ou se o user_id
// não é um UUID válido — neste caso o handler deve tratar como "sem
// contexto autenticado" (ex.: rotas públicas).
func authContext(ctx context.Context) (userID uuid.UUID, perfil string, ok bool) {
	uidStr, _ := ctx.Value(middleware.ContextKeyUserID).(string)
	if uidStr == "" {
		return uuid.Nil, "", false
	}
	parsed, err := uuid.Parse(uidStr)
	if err != nil {
		return uuid.Nil, "", false
	}
	perfil, _ = ctx.Value(middleware.ContextKeyPerfil).(string)
	return parsed, perfil, true
}
