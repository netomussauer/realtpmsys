package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

// PgxPlanoRepository implementa financeiro.PlanoRepository com pgx + sqlc.
type PgxPlanoRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxPlanoRepository(pool *pgxpool.Pool) *PgxPlanoRepository {
	return &PgxPlanoRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

// GetByID retorna o plano pelo ID. Retorna nil se não encontrado.
func (r *PgxPlanoRepository) GetByID(ctx context.Context, id uuid.UUID) (*financeiro.Plano, error) {
	row, err := r.queries.GetPlanoByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetPlanoByID: %w", err)
	}
	return toPlanoEntity(row), nil
}

// ListAtivos retorna todos os planos com `ativo = true` ordenados por valor.
func (r *PgxPlanoRepository) ListAtivos(ctx context.Context) ([]*financeiro.Plano, error) {
	rows, err := r.queries.ListPlanosAtivos(ctx)
	if err != nil {
		return nil, fmt.Errorf("ListPlanosAtivos: %w", err)
	}
	result := make([]*financeiro.Plano, len(rows))
	for i, row := range rows {
		result[i] = toPlanoEntity(row)
	}
	return result, nil
}

// Save persiste o plano via upsert (INSERT ... ON CONFLICT DO UPDATE).
func (r *PgxPlanoRepository) Save(ctx context.Context, p *financeiro.Plano) error {
	_, err := r.queries.UpsertPlano(ctx, sqlcgen.UpsertPlanoParams{
		ID:            p.ID,
		Nome:          p.Nome,
		DiasSemana:    int32(p.DiasSemana),
		ValorMensal:   p.ValorMensal,
		DiaVencimento: int32(p.DiaVencimento),
		Ativo:         p.Ativo,
	})
	if err != nil {
		return fmt.Errorf("UpsertPlano: %w", err)
	}
	return nil
}

func toPlanoEntity(row sqlcgen.Plano) *financeiro.Plano {
	return &financeiro.Plano{
		ID:            row.ID,
		Nome:          row.Nome,
		DiasSemana:    int(row.DiasSemana),
		ValorMensal:   row.ValorMensal,
		DiaVencimento: int(row.DiaVencimento),
		Ativo:         row.Ativo,
		CriadoEm:      row.CriadoEm,
		AtualizadoEm:  row.AtualizadoEm,
	}
}
