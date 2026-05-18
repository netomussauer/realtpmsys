package treinador

import (
	"context"

	"github.com/google/uuid"
)

// Repository é o Port do contexto Treinadores.
type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Treinador, error)
	GetByCPF(ctx context.Context, cpf string) (*Treinador, error)
	GetByUsuarioID(ctx context.Context, usuarioID uuid.UUID) (*Treinador, error)
	List(ctx context.Context, filter ListFilter) ([]*Treinador, int64, error)
	Save(ctx context.Context, t *Treinador) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
}

// ListFilter parametriza a listagem.
type ListFilter struct {
	Nome    string
	Status  *Status
	Page    int
	PerPage int
}
