package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	domtreinador "github.com/realtpmsys/realtpmsys/internal/domain/treinador"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

type PgxTreinadorRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxTreinadorRepository(pool *pgxpool.Pool) *PgxTreinadorRepository {
	return &PgxTreinadorRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxTreinadorRepository) GetByID(ctx context.Context, id uuid.UUID) (*domtreinador.Treinador, error) {
	row, err := r.queries.GetTreinadorByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetTreinadorByID: %w", err)
	}
	return toTreinadorEntity(row), nil
}

func (r *PgxTreinadorRepository) GetByCPF(ctx context.Context, cpf string) (*domtreinador.Treinador, error) {
	row, err := r.queries.GetTreinadorByCPF(ctx, &cpf)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetTreinadorByCPF: %w", err)
	}
	return toTreinadorEntity(row), nil
}

func (r *PgxTreinadorRepository) GetByUsuarioID(ctx context.Context, usuarioID uuid.UUID) (*domtreinador.Treinador, error) {
	row, err := r.queries.GetTreinadorByUsuarioID(ctx, usuarioID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetTreinadorByUsuarioID: %w", err)
	}
	return toTreinadorEntity(row), nil
}

func (r *PgxTreinadorRepository) List(ctx context.Context, f domtreinador.ListFilter) ([]*domtreinador.Treinador, int64, error) {
	page, perPage := normalizePagination(f.Page, f.PerPage)
	listParams := sqlcgen.ListTreinadoresParams{
		Lim: int32(perPage),
		Off: int32((page - 1) * perPage),
	}
	if f.Nome != "" {
		n := f.Nome
		listParams.Nome = &n
	}
	if f.Status != nil {
		s := string(*f.Status)
		listParams.Status = &s
	}
	rows, err := r.queries.ListTreinadores(ctx, listParams)
	if err != nil {
		return nil, 0, fmt.Errorf("ListTreinadores: %w", err)
	}
	total, err := r.queries.CountTreinadores(ctx, sqlcgen.CountTreinadoresParams{
		Nome:   listParams.Nome,
		Status: listParams.Status,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("CountTreinadores: %w", err)
	}
	result := make([]*domtreinador.Treinador, len(rows))
	for i, row := range rows {
		result[i] = toTreinadorEntity(row)
	}
	return result, total, nil
}

func (r *PgxTreinadorRepository) Save(ctx context.Context, t *domtreinador.Treinador) error {
	_, err := r.queries.UpsertTreinador(ctx, sqlcgen.UpsertTreinadorParams{
		ID:        t.ID,
		UsuarioID: t.UsuarioID,
		Nome:      t.Nome,
		Cpf:       t.CPF,
		Cref:      t.CREF,
		Telefone:  t.Telefone,
		Status:    string(t.Status),
	})
	if err != nil {
		return fmt.Errorf("UpsertTreinador: %w", err)
	}
	return nil
}

func (r *PgxTreinadorRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	if err := r.queries.SoftDeleteTreinador(ctx, id); err != nil {
		return fmt.Errorf("SoftDeleteTreinador: %w", err)
	}
	return nil
}

func toTreinadorEntity(row sqlcgen.Treinador) *domtreinador.Treinador {
	return &domtreinador.Treinador{
		ID:           row.ID,
		UsuarioID:    row.UsuarioID,
		Nome:         row.Nome,
		CPF:          row.Cpf,
		CREF:         row.Cref,
		Telefone:     row.Telefone,
		Status:       domtreinador.Status(row.Status),
		CriadoEm:     row.CriadoEm,
		AtualizadoEm: row.AtualizadoEm,
		DeletadoEm:   row.DeletadoEm,
	}
}
