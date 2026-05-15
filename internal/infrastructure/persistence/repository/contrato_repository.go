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

// PgxContratoRepository implementa financeiro.ContratoRepository com pgx + sqlc.
type PgxContratoRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxContratoRepository(pool *pgxpool.Pool) *PgxContratoRepository {
	return &PgxContratoRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxContratoRepository) GetByID(ctx context.Context, id uuid.UUID) (*financeiro.Contrato, error) {
	row, err := r.queries.GetContratoByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetContratoByID: %w", err)
	}
	return toContratoEntity(row), nil
}

func (r *PgxContratoRepository) GetAtivoPorAtleta(ctx context.Context, atletaID uuid.UUID) (*financeiro.Contrato, error) {
	row, err := r.queries.GetContratoAtivoPorAtleta(ctx, atletaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetContratoAtivoPorAtleta: %w", err)
	}
	return toContratoEntity(row), nil
}

// ListAtivos retorna contratos com status ATIVO. O JOIN com planos garante
// que o dia_vencimento esteja disponível para o GerarMensalidadesUseCase,
// mas aqui retornamos apenas a entidade Contrato — o use case busca o plano
// via PlanoRepository quando precisa.
func (r *PgxContratoRepository) ListAtivos(ctx context.Context) ([]*financeiro.Contrato, error) {
	rows, err := r.queries.ListContratosAtivos(ctx)
	if err != nil {
		return nil, fmt.Errorf("ListContratosAtivos: %w", err)
	}
	result := make([]*financeiro.Contrato, len(rows))
	for i, row := range rows {
		result[i] = &financeiro.Contrato{
			ID:              row.ID,
			AtletaID:        row.AtletaID,
			PlanoID:         row.PlanoID,
			DataInicio:      row.DataInicio,
			DataFim:         row.DataFim,
			ValorContratado: row.ValorContratado,
			Status:          financeiro.StatusContrato(row.Status),
			CriadoEm:        row.CriadoEm,
			AtualizadoEm:    row.AtualizadoEm,
		}
	}
	return result, nil
}

// Save persiste o contrato via upsert (INSERT ... ON CONFLICT DO UPDATE).
func (r *PgxContratoRepository) Save(ctx context.Context, c *financeiro.Contrato) error {
	_, err := r.queries.UpsertContrato(ctx, sqlcgen.UpsertContratoParams{
		ID:              c.ID,
		AtletaID:        c.AtletaID,
		PlanoID:         c.PlanoID,
		DataInicio:      c.DataInicio,
		DataFim:         c.DataFim,
		ValorContratado: c.ValorContratado,
		Status:          string(c.Status),
	})
	if err != nil {
		return fmt.Errorf("UpsertContrato: %w", err)
	}
	return nil
}

func toContratoEntity(row sqlcgen.Contrato) *financeiro.Contrato {
	return &financeiro.Contrato{
		ID:              row.ID,
		AtletaID:        row.AtletaID,
		PlanoID:         row.PlanoID,
		DataInicio:      row.DataInicio,
		DataFim:         row.DataFim,
		ValorContratado: row.ValorContratado,
		Status:          financeiro.StatusContrato(row.Status),
		CriadoEm:        row.CriadoEm,
		AtualizadoEm:    row.AtualizadoEm,
	}
}
