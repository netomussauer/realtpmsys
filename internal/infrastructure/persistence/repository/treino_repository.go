package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	domfreq "github.com/realtpmsys/realtpmsys/internal/domain/frequencia"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

type PgxTreinoRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxTreinoRepository(pool *pgxpool.Pool) *PgxTreinoRepository {
	return &PgxTreinoRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxTreinoRepository) GetByID(ctx context.Context, id uuid.UUID) (*domfreq.Treino, error) {
	row, err := r.queries.GetTreinoByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetTreinoByID: %w", err)
	}
	return toTreinoEntity(row), nil
}

func (r *PgxTreinoRepository) GetByTurmaData(ctx context.Context, turmaID uuid.UUID, data time.Time) (*domfreq.Treino, error) {
	row, err := r.queries.GetTreinoByTurmaData(ctx, sqlcgen.GetTreinoByTurmaDataParams{
		TurmaID:    turmaID,
		DataTreino: data,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetTreinoByTurmaData: %w", err)
	}
	return toTreinoEntity(row), nil
}

func (r *PgxTreinoRepository) ListPorTurma(ctx context.Context, turmaID uuid.UUID, f domfreq.TreinoListFilter) ([]*domfreq.Treino, int64, error) {
	page, perPage := normalizePagination(f.Page, f.PerPage)
	listParams := sqlcgen.ListTreinosPorTurmaParams{
		TurmaID: turmaID,
		Lim:     int32(perPage),
		Off:     int32((page - 1) * perPage),
	}
	if f.DataInicio != nil {
		di := *f.DataInicio
		listParams.DataInicio = &di
	}
	if f.DataFim != nil {
		df := *f.DataFim
		listParams.DataFim = &df
	}
	rows, err := r.queries.ListTreinosPorTurma(ctx, listParams)
	if err != nil {
		return nil, 0, fmt.Errorf("ListTreinosPorTurma: %w", err)
	}
	total, err := r.queries.CountTreinosPorTurma(ctx, sqlcgen.CountTreinosPorTurmaParams{
		TurmaID:    turmaID,
		DataInicio: listParams.DataInicio,
		DataFim:    listParams.DataFim,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("CountTreinosPorTurma: %w", err)
	}
	result := make([]*domfreq.Treino, len(rows))
	for i, row := range rows {
		result[i] = toTreinoEntity(row)
	}
	return result, total, nil
}

func (r *PgxTreinoRepository) Save(ctx context.Context, t *domfreq.Treino) error {
	var horaIni, horaFim pgtype.Time
	if t.HoraInicio != "" {
		hi, err := stringToPgTime(t.HoraInicio)
		if err != nil {
			return fmt.Errorf("hora_inicio inválida (%s): %w", t.HoraInicio, err)
		}
		horaIni = hi
	}
	if t.HoraFim != "" {
		hf, err := stringToPgTime(t.HoraFim)
		if err != nil {
			return fmt.Errorf("hora_fim inválida (%s): %w", t.HoraFim, err)
		}
		horaFim = hf
	}
	_, err := r.queries.UpsertTreino(ctx, sqlcgen.UpsertTreinoParams{
		ID:         t.ID,
		TurmaID:    t.TurmaID,
		DataTreino: t.DataTreino,
		HoraInicio: horaIni,
		HoraFim:    horaFim,
		Observacao: t.Observacao,
	})
	if err != nil {
		return fmt.Errorf("UpsertTreino: %w", err)
	}
	return nil
}

func toTreinoEntity(row sqlcgen.Treino) *domfreq.Treino {
	return &domfreq.Treino{
		ID:         row.ID,
		TurmaID:    row.TurmaID,
		DataTreino: row.DataTreino,
		HoraInicio: pgTimeToString(row.HoraInicio),
		HoraFim:    pgTimeToString(row.HoraFim),
		Observacao: row.Observacao,
		CriadoEm:   row.CriadoEm,
	}
}
