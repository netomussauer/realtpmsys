package campo

import (
	"context"

	"github.com/google/uuid"
)

// Repository é o Port do contexto Campos.
type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Campo, error)
	List(ctx context.Context, filter ListFilter) ([]*Campo, int64, error)
	Save(ctx context.Context, c *Campo) error
}

// ListFilter parametriza a listagem.
type ListFilter struct {
	Nome    string
	Ativo   *bool
	Page    int
	PerPage int
}
