package repository

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	domfreq "github.com/realtpmsys/realtpmsys/internal/domain/frequencia"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

type PgxFrequenciaRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxFrequenciaRepository(pool *pgxpool.Pool) *PgxFrequenciaRepository {
	return &PgxFrequenciaRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxFrequenciaRepository) ListPorTreino(ctx context.Context, treinoID uuid.UUID) ([]*domfreq.Frequencia, error) {
	rows, err := r.queries.ListFrequenciasPorTreino(ctx, treinoID)
	if err != nil {
		return nil, fmt.Errorf("ListFrequenciasPorTreino: %w", err)
	}
	result := make([]*domfreq.Frequencia, len(rows))
	for i, row := range rows {
		result[i] = toFrequenciaEntity(row)
	}
	return result, nil
}

// SaveBatch persiste/atualiza um lote em transação. Upsert por (treino_id, atleta_id).
func (r *PgxFrequenciaRepository) SaveBatch(ctx context.Context, treinoID uuid.UUID, frequencias []*domfreq.Frequencia) error {
	if len(frequencias) == 0 {
		return nil
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("iniciar transação: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	qtx := r.queries.WithTx(tx)

	for _, f := range frequencias {
		if f.TreinoID != treinoID {
			return fmt.Errorf("frequência aponta para treino %s, esperado %s", f.TreinoID, treinoID)
		}
		if _, err := qtx.UpsertFrequencia(ctx, sqlcgen.UpsertFrequenciaParams{
			ID:            f.ID,
			TreinoID:      f.TreinoID,
			AtletaID:      f.AtletaID,
			Presenca:      string(f.Presenca),
			Justificativa: f.Justificativa,
		}); err != nil {
			return fmt.Errorf("UpsertFrequencia atleta %s: %w", f.AtletaID, err)
		}
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transação: %w", err)
	}
	return nil
}

func toFrequenciaEntity(row sqlcgen.Frequencia) *domfreq.Frequencia {
	return &domfreq.Frequencia{
		ID:            row.ID,
		TreinoID:      row.TreinoID,
		AtletaID:      row.AtletaID,
		Presenca:      domfreq.Presenca(row.Presenca),
		Justificativa: row.Justificativa,
		RegistradoEm:  row.RegistradoEm,
	}
}
