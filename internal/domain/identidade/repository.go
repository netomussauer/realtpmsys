package identidade

import (
	"context"

	"github.com/google/uuid"
)

// Repository é o Port do contexto Identidade.
type Repository interface {
	GetByEmail(ctx context.Context, email string) (*Usuario, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Usuario, error)
}
