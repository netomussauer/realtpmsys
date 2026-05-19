package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

type PgxUniformeRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxUniformeRepository(pool *pgxpool.Pool) *PgxUniformeRepository {
	return &PgxUniformeRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxUniformeRepository) GetByAtleta(ctx context.Context, atletaID uuid.UUID) (*atleta.Uniforme, error) {
	row, err := r.queries.GetUniformeByAtleta(ctx, atletaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetUniformeByAtleta: %w", err)
	}
	return toUniformeEntity(row), nil
}

func (r *PgxUniformeRepository) Save(ctx context.Context, u *atleta.Uniforme) error {
	_, err := r.queries.UpsertUniforme(ctx, sqlcgen.UpsertUniformeParams{
		ID:          u.ID,
		AtletaID:    u.AtletaID,
		TamCamisa:   u.TamCamisa,
		TamShort:    u.TamShort,
		TamChuteira: u.TamChuteira,
	})
	if err != nil {
		return fmt.Errorf("UpsertUniforme: %w", err)
	}
	return nil
}

func toUniformeEntity(row sqlcgen.Uniforme) *atleta.Uniforme {
	return &atleta.Uniforme{
		ID:           row.ID,
		AtletaID:     row.AtletaID,
		TamCamisa:    row.TamCamisa,
		TamShort:     row.TamShort,
		TamChuteira:  row.TamChuteira,
		AtualizadoEm: row.AtualizadoEm,
	}
}
