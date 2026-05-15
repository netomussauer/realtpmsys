package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domainturma "github.com/realtpmsys/realtpmsys/internal/domain/turma"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

type PgxMatriculaRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxMatriculaRepository(pool *pgxpool.Pool) *PgxMatriculaRepository {
	return &PgxMatriculaRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxMatriculaRepository) GetByID(ctx context.Context, id uuid.UUID) (*domainturma.Matricula, error) {
	row, err := r.queries.GetMatriculaByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetMatriculaByID: %w", err)
	}
	return toMatriculaEntity(row), nil
}

func (r *PgxMatriculaRepository) GetAtivaByAtletaTurma(ctx context.Context, atletaID, turmaID uuid.UUID) (*domainturma.Matricula, error) {
	row, err := r.queries.GetMatriculaAtivaByAtletaTurma(ctx, sqlcgen.GetMatriculaAtivaByAtletaTurmaParams{
		AtletaID: atletaID,
		TurmaID:  turmaID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetMatriculaAtivaByAtletaTurma: %w", err)
	}
	return toMatriculaEntity(row), nil
}

func (r *PgxMatriculaRepository) ListPorTurma(ctx context.Context, turmaID uuid.UUID, f domainturma.MatriculaListFilter) ([]*domainturma.Matricula, int64, error) {
	page, perPage := normalizePagination(f.Page, f.PerPage)
	params := sqlcgen.ListMatriculasPorTurmaParams{
		TurmaID: turmaID,
		Lim:     int32(perPage),
		Off:     int32((page - 1) * perPage),
	}
	if f.Status != nil {
		s := string(*f.Status)
		params.Status = &s
	}
	rows, err := r.queries.ListMatriculasPorTurma(ctx, params)
	if err != nil {
		return nil, 0, fmt.Errorf("ListMatriculasPorTurma: %w", err)
	}
	total, err := r.queries.CountMatriculasPorTurma(ctx, sqlcgen.CountMatriculasPorTurmaParams{
		TurmaID: turmaID,
		Status:  params.Status,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("CountMatriculasPorTurma: %w", err)
	}
	result := make([]*domainturma.Matricula, len(rows))
	for i, row := range rows {
		result[i] = toMatriculaEntity(row)
	}
	return result, total, nil
}

func (r *PgxMatriculaRepository) CountAtivasPorTurma(ctx context.Context, turmaID uuid.UUID) (int64, error) {
	n, err := r.queries.CountMatriculasAtivasPorTurma(ctx, turmaID)
	if err != nil {
		return 0, fmt.Errorf("CountMatriculasAtivasPorTurma: %w", err)
	}
	return n, nil
}

func (r *PgxMatriculaRepository) Save(ctx context.Context, m *domainturma.Matricula) error {
	_, err := r.queries.UpsertMatricula(ctx, sqlcgen.UpsertMatriculaParams{
		ID:         m.ID,
		AtletaID:   m.AtletaID,
		TurmaID:    m.TurmaID,
		DataInicio: m.DataInicio,
		DataFim:    m.DataFim,
		Status:     string(m.Status),
	})
	if err != nil {
		return fmt.Errorf("UpsertMatricula: %w", err)
	}
	return nil
}

func toMatriculaEntity(row sqlcgen.Matricula) *domainturma.Matricula {
	return &domainturma.Matricula{
		ID:           row.ID,
		AtletaID:     row.AtletaID,
		TurmaID:      row.TurmaID,
		DataInicio:   row.DataInicio,
		DataFim:      row.DataFim,
		Status:       domainturma.StatusMatricula(row.Status),
		CriadoEm:     row.CriadoEm,
		AtualizadoEm: row.AtualizadoEm,
	}
}
