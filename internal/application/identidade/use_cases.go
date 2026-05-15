// Package identidade contém os casos de uso do contexto Identidade.
package identidade

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"golang.org/x/crypto/bcrypt"
)

// LoginInput carrega as credenciais informadas pelo cliente.
type LoginInput struct {
	Email string
	Senha string
}

// LoginOutput é o resultado de um login bem-sucedido.
type LoginOutput struct {
	AccessToken string
	ExpiresAt   time.Time
	UserID      uuid.UUID
	Perfil      identidade.Perfil
}

// LoginUseCase autentica um usuário e emite um JWT HS256.
type LoginUseCase struct {
	usuarios          identidade.Repository
	jwtSecret         []byte
	accessExpiresMins int
}

func NewLoginUseCase(usuarios identidade.Repository, jwtSecret string, accessExpiresMins int) *LoginUseCase {
	return &LoginUseCase{
		usuarios:          usuarios,
		jwtSecret:         []byte(jwtSecret),
		accessExpiresMins: accessExpiresMins,
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

	expiresAt := time.Now().Add(time.Duration(uc.accessExpiresMins) * time.Minute)
	claims := jwt.MapClaims{
		"user_id": usuario.ID.String(),
		"perfil":  string(usuario.Perfil),
		"exp":     expiresAt.Unix(),
		"iat":     time.Now().Unix(),
		"sub":     usuario.ID.String(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(uc.jwtSecret)
	if err != nil {
		return nil, fmt.Errorf("assinar token: %w", err)
	}

	return &LoginOutput{
		AccessToken: signed,
		ExpiresAt:   expiresAt,
		UserID:      usuario.ID,
		Perfil:      usuario.Perfil,
	}, nil
}
