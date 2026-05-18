package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domcampo "github.com/realtpmsys/realtpmsys/internal/domain/campo"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

type PgxCampoRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxCampoRepository(pool *pgxpool.Pool) *PgxCampoRepository {
	return &PgxCampoRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxCampoRepository) GetByID(ctx context.Context, id uuid.UUID) (*domcampo.Campo, error) {
	row, err := r.queries.GetCampoByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetCampoByID: %w", err)
	}
	return toCampoEntity(row), nil
}

func (r *PgxCampoRepository) List(ctx context.Context, f domcampo.ListFilter) ([]*domcampo.Campo, int64, error) {
	page, perPage := normalizePagination(f.Page, f.PerPage)
	listParams := sqlcgen.ListCamposParams{
		Lim: int32(perPage),
		Off: int32((page - 1) * perPage),
	}
	if f.Nome != "" {
		n := f.Nome
		listParams.Nome = &n
	}
	if f.Ativo != nil {
		v := *f.Ativo
		listParams.Ativo = &v
	}
	rows, err := r.queries.ListCampos(ctx, listParams)
	if err != nil {
		return nil, 0, fmt.Errorf("ListCampos: %w", err)
	}
	total, err := r.queries.CountCampos(ctx, sqlcgen.CountCamposParams{
		Nome:  listParams.Nome,
		Ativo: listParams.Ativo,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("CountCampos: %w", err)
	}
	result := make([]*domcampo.Campo, len(rows))
	for i, row := range rows {
		result[i] = toCampoEntity(row)
	}
	return result, total, nil
}

func (r *PgxCampoRepository) Save(ctx context.Context, c *domcampo.Campo) error {
	var cap *int32
	if c.CapacidadeMax != nil {
		v := int32(*c.CapacidadeMax)
		cap = &v
	}
	_, err := r.queries.UpsertCampo(ctx, sqlcgen.UpsertCampoParams{
		ID:            c.ID,
		Nome:          c.Nome,
		Endereco:      c.Endereco,
		CapacidadeMax: cap,
		Ativo:         c.Ativo,
	})
	if err != nil {
		return fmt.Errorf("UpsertCampo: %w", err)
	}
	return nil
}

func toCampoEntity(row sqlcgen.Campo) *domcampo.Campo {
	var capMax *int
	if row.CapacidadeMax != nil {
		v := int(*row.CapacidadeMax)
		capMax = &v
	}
	return &domcampo.Campo{
		ID:            row.ID,
		Nome:          row.Nome,
		Endereco:      row.Endereco,
		CapacidadeMax: capMax,
		Ativo:         row.Ativo,
	}
}
