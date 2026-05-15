package identidade

import "context"

// Repository é o Port do contexto Identidade.
type Repository interface {
	GetByEmail(ctx context.Context, email string) (*Usuario, error)
}
