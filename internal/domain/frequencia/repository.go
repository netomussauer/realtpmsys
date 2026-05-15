package frequencia

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// TreinoRepository é o Port para persistência de Treinos.
type TreinoRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Treino, error)
	GetByTurmaData(ctx context.Context, turmaID uuid.UUID, data time.Time) (*Treino, error)
	ListPorTurma(ctx context.Context, turmaID uuid.UUID, filter TreinoListFilter) ([]*Treino, int64, error)
	Save(ctx context.Context, t *Treino) error
}

// TreinoListFilter parametriza a listagem de treinos por turma.
type TreinoListFilter struct {
	DataInicio *time.Time
	DataFim    *time.Time
	Page       int
	PerPage    int
}

// FrequenciaRepository é o Port para persistência de Frequências.
type FrequenciaRepository interface {
	ListPorTreino(ctx context.Context, treinoID uuid.UUID) ([]*Frequencia, error)
	// SaveBatch persiste/atualiza um lote em transação. Upsert por (treino_id, atleta_id).
	SaveBatch(ctx context.Context, treinoID uuid.UUID, frequencias []*Frequencia) error
}
