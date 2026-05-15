// Package identidade contém as entidades do contexto Identidade.
package identidade

import (
	"time"

	"github.com/google/uuid"
)

// Perfil representa o papel do usuário no sistema.
type Perfil string

const (
	PerfilAdmin        Perfil = "ADMIN"
	PerfilTreinador    Perfil = "TREINADOR"
	PerfilResponsavel  Perfil = "RESPONSAVEL"
)

// Usuario é o Aggregate Root do contexto Identidade.
type Usuario struct {
	ID           uuid.UUID
	Email        string
	SenhaHash    string
	Perfil       Perfil
	Ativo        bool
	CriadoEm     time.Time
	AtualizadoEm time.Time
	DeletadoEm   *time.Time
}
