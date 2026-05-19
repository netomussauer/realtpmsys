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

// ResponsavelRepository é o Port para Responsavel.
type ResponsavelRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Responsavel, error)
	GetByCPF(ctx context.Context, cpf string) (*Responsavel, error)
	ListByAtleta(ctx context.Context, atletaID uuid.UUID) ([]*Responsavel, error)
	GetPrincipalDoAtleta(ctx context.Context, atletaID uuid.UUID) (*Responsavel, error)
	// SaveWithPrincipalSwap insere/atualiza o responsável. Se r.ContatoPrincipal
	// for true e já houver outro principal para o mesmo atleta, despromove-o
	// na mesma transação (respeitando o unique index parcial do DB).
	SaveWithPrincipalSwap(ctx context.Context, r *Responsavel) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// UniformeRepository é o Port para Uniforme.
// Cada atleta tem no máximo um Uniforme (1:1).
type UniformeRepository interface {
	GetByAtleta(ctx context.Context, atletaID uuid.UUID) (*Uniforme, error)
	// Save faz upsert por atleta_id (constraint unique).
	Save(ctx context.Context, u *Uniforme) error
}
