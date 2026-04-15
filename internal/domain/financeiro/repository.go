package financeiro

import (
	"context"

	"github.com/google/uuid"
)

// PlanoRepository é o Port para persistência de Planos.
type PlanoRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Plano, error)
	ListAtivos(ctx context.Context) ([]*Plano, error)
	Save(ctx context.Context, plano *Plano) error
}

// ContratoRepository é o Port para persistência de Contratos.
type ContratoRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Contrato, error)
	GetAtivoPorAtleta(ctx context.Context, atletaID uuid.UUID) (*Contrato, error)
	ListAtivos(ctx context.Context) ([]*Contrato, error)
	Save(ctx context.Context, contrato *Contrato) error
}

// MensalidadeRepository é o Port para persistência de Mensalidades.
type MensalidadeRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Mensalidade, error)
	GetByContratoCompetencia(ctx context.Context, contratoID uuid.UUID, ano, mes int) (*Mensalidade, error)
	List(ctx context.Context, filter MensalidadeFilter) ([]*Mensalidade, int64, error)
	Save(ctx context.Context, mensalidade *Mensalidade) error
	SaveBatch(ctx context.Context, mensalidades []*Mensalidade) error
}

// MensalidadeFilter encapsula os parâmetros de listagem de mensalidades.
type MensalidadeFilter struct {
	AtletaID       *uuid.UUID
	Status         *StatusMensalidade
	CompetenciaAno *int
	CompetenciaMes *int
	Page           int
	PerPage        int
}
