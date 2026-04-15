package atleta

import (
	"context"

	"github.com/google/uuid"
)

// Repository é o Port do contexto Atletas.
// A implementação concreta fica em internal/infrastructure/persistence/repository.
type Repository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Atleta, error)
	GetByCPF(ctx context.Context, cpf string) (*Atleta, error)
	List(ctx context.Context, filter ListFilter) ([]*Atleta, int64, error)
	Save(ctx context.Context, atleta *Atleta) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
}

// ListFilter encapsula os parâmetros de busca de atletas.
type ListFilter struct {
	Nome    string
	Status  *Status
	TurmaID *uuid.UUID
	Page    int
	PerPage int
}
