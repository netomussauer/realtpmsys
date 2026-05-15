package turma

import (
	"context"

	"github.com/google/uuid"
)

// TurmaRepository é o Port para persistência de Turmas (com seus horários).
type TurmaRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Turma, error)
	List(ctx context.Context, filter TurmaListFilter) ([]*Turma, int64, error)
	// Save persiste a turma e seus horários numa única transação.
	Save(ctx context.Context, t *Turma) error
	SoftDelete(ctx context.Context, id uuid.UUID) error
}

// TurmaListFilter parametriza a listagem de turmas.
type TurmaListFilter struct {
	Nome    string
	Status  *Status
	Page    int
	PerPage int
}

// MatriculaRepository é o Port para persistência de Matrículas.
type MatriculaRepository interface {
	GetByID(ctx context.Context, id uuid.UUID) (*Matricula, error)
	// GetAtivaByAtletaTurma retorna a matrícula ATIVA do atleta na turma, se existir.
	GetAtivaByAtletaTurma(ctx context.Context, atletaID, turmaID uuid.UUID) (*Matricula, error)
	ListPorTurma(ctx context.Context, turmaID uuid.UUID, filter MatriculaListFilter) ([]*Matricula, int64, error)
	CountAtivasPorTurma(ctx context.Context, turmaID uuid.UUID) (int64, error)
	Save(ctx context.Context, m *Matricula) error
}

// MatriculaListFilter parametriza a listagem de matrículas de uma turma.
type MatriculaListFilter struct {
	Status  *StatusMatricula
	Page    int
	PerPage int
}
