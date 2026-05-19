// Package identidade contém os casos de uso do contexto Identidade.
package identidade

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"golang.org/x/crypto/bcrypt"
)

// Tipos de token emitidos. Diferencia access (curta duração, usado nas chamadas
// /api/v1/*) de refresh (longa duração, usado apenas em /auth/refresh).
const (
	tokenTypeAccess  = "access"
	tokenTypeRefresh = "refresh"
)

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

type LoginInput struct {
	Email string
	Senha string
}

// LoginOutput carrega o par de tokens emitido após autenticação.
//
// Trade-off documentado: tokens são stateless (não há revogação até expirar).
// Em produção real migrar para refresh tokens persistidos + revogáveis.
type LoginOutput struct {
	AccessToken  string
	RefreshToken string
	AccessExpiresAt  time.Time
	RefreshExpiresAt time.Time
	UserID  uuid.UUID
	Perfil  identidade.Perfil
}

type LoginUseCase struct {
	usuarios            identidade.Repository
	jwtSecret           []byte
	accessExpiresMins   int
	refreshExpiresDays  int
}

func NewLoginUseCase(usuarios identidade.Repository, jwtSecret string, accessExpiresMins, refreshExpiresDays int) *LoginUseCase {
	return &LoginUseCase{
		usuarios:           usuarios,
		jwtSecret:          []byte(jwtSecret),
		accessExpiresMins:  accessExpiresMins,
		refreshExpiresDays: refreshExpiresDays,
	}
}

func (uc *LoginUseCase) Execute(ctx context.Context, in LoginInput) (*LoginOutput, error) {
	usuario, err := uc.usuarios.GetByEmail(ctx, in.Email)
	if err != nil {
		return nil, fmt.Errorf("buscar usuário: %w", err)
	}
	if usuario == nil {
		return nil, shared.ErrCredenciaisInvalidas
	}
	if !usuario.Ativo {
		return nil, shared.ErrUsuarioInativo
	}
	if err := bcrypt.CompareHashAndPassword([]byte(usuario.SenhaHash), []byte(in.Senha)); err != nil {
		return nil, shared.ErrCredenciaisInvalidas
	}

	accessExp := time.Now().Add(time.Duration(uc.accessExpiresMins) * time.Minute)
	access, err := emitirToken(uc.jwtSecret, usuario, tokenTypeAccess, accessExp)
	if err != nil {
		return nil, err
	}

	refreshExp := time.Now().Add(time.Duration(uc.refreshExpiresDays) * 24 * time.Hour)
	refresh, err := emitirToken(uc.jwtSecret, usuario, tokenTypeRefresh, refreshExp)
	if err != nil {
		return nil, err
	}

	return &LoginOutput{
		AccessToken:      access,
		RefreshToken:     refresh,
		AccessExpiresAt:  accessExp,
		RefreshExpiresAt: refreshExp,
		UserID:           usuario.ID,
		Perfil:           usuario.Perfil,
	}, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH
// ─────────────────────────────────────────────────────────────────────────────

type RefreshTokenInput struct {
	RefreshToken string
}

// RefreshTokenOutput carrega o novo access token (refresh não rotaciona —
// continua válido até o expires_at original). Para rotação seria preciso
// persistir o token revogado no DB.
type RefreshTokenOutput struct {
	AccessToken     string
	AccessExpiresAt time.Time
	UserID          uuid.UUID
	Perfil          identidade.Perfil
}

type RefreshTokenUseCase struct {
	usuarios          identidade.Repository
	jwtSecret         []byte
	accessExpiresMins int
}

func NewRefreshTokenUseCase(usuarios identidade.Repository, jwtSecret string, accessExpiresMins int) *RefreshTokenUseCase {
	return &RefreshTokenUseCase{
		usuarios:          usuarios,
		jwtSecret:         []byte(jwtSecret),
		accessExpiresMins: accessExpiresMins,
	}
}

func (uc *RefreshTokenUseCase) Execute(ctx context.Context, in RefreshTokenInput) (*RefreshTokenOutput, error) {
	if in.RefreshToken == "" {
		return nil, shared.ErrCredenciaisInvalidas
	}

	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(in.RefreshToken, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return uc.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, shared.ErrCredenciaisInvalidas
	}

	// Rejeita access token usado como refresh — só aceita typ=refresh.
	if typ, _ := claims["typ"].(string); typ != tokenTypeRefresh {
		return nil, shared.ErrCredenciaisInvalidas
	}

	userIDStr, _ := claims["user_id"].(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return nil, shared.ErrCredenciaisInvalidas
	}

	usuario, err := uc.usuarios.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("buscar usuário: %w", err)
	}
	if usuario == nil {
		// Token válido mas usuário sumiu — credencial inválida.
		return nil, shared.ErrCredenciaisInvalidas
	}
	if !usuario.Ativo {
		return nil, shared.ErrUsuarioInativo
	}

	accessExp := time.Now().Add(time.Duration(uc.accessExpiresMins) * time.Minute)
	access, err := emitirToken(uc.jwtSecret, usuario, tokenTypeAccess, accessExp)
	if err != nil {
		return nil, err
	}
	return &RefreshTokenOutput{
		AccessToken:     access,
		AccessExpiresAt: accessExp,
		UserID:          usuario.ID,
		Perfil:          usuario.Perfil,
	}, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

// emitirToken assina um JWT HS256 com claim `typ` para diferenciar access de refresh.
// O middleware de Auth deve rejeitar tokens com `typ != access`.
func emitirToken(secret []byte, u *identidade.Usuario, typ string, expiresAt time.Time) (string, error) {
	if u == nil {
		return "", errors.New("usuário nulo")
	}
	claims := jwt.MapClaims{
		"user_id": u.ID.String(),
		"perfil":  string(u.Perfil),
		"typ":     typ,
		"exp":     expiresAt.Unix(),
		"iat":     time.Now().Unix(),
		"sub":     u.ID.String(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(secret)
	if err != nil {
		return "", fmt.Errorf("assinar token: %w", err)
	}
	return signed, nil
}
