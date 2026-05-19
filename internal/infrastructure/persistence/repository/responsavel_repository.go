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

type PgxResponsavelRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxResponsavelRepository(pool *pgxpool.Pool) *PgxResponsavelRepository {
	return &PgxResponsavelRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxResponsavelRepository) GetByID(ctx context.Context, id uuid.UUID) (*atleta.Responsavel, error) {
	row, err := r.queries.GetResponsavelByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetResponsavelByID: %w", err)
	}
	return toResponsavelEntity(row), nil
}

func (r *PgxResponsavelRepository) GetByCPF(ctx context.Context, cpf string) (*atleta.Responsavel, error) {
	row, err := r.queries.GetResponsavelByCPF(ctx, &cpf)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetResponsavelByCPF: %w", err)
	}
	return toResponsavelEntity(row), nil
}

func (r *PgxResponsavelRepository) ListByAtleta(ctx context.Context, atletaID uuid.UUID) ([]*atleta.Responsavel, error) {
	rows, err := r.queries.ListResponsaveisDoAtleta(ctx, atletaID)
	if err != nil {
		return nil, fmt.Errorf("ListResponsaveisDoAtleta: %w", err)
	}
	result := make([]*atleta.Responsavel, len(rows))
	for i, row := range rows {
		result[i] = toResponsavelEntity(row)
	}
	return result, nil
}

func (r *PgxResponsavelRepository) GetPrincipalDoAtleta(ctx context.Context, atletaID uuid.UUID) (*atleta.Responsavel, error) {
	row, err := r.queries.GetPrincipalDoAtleta(ctx, atletaID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetPrincipalDoAtleta: %w", err)
	}
	return toResponsavelEntity(row), nil
}

// SaveWithPrincipalSwap insere/atualiza o responsável. Se r.ContatoPrincipal
// for true, despromove o principal atual do atleta na mesma transação (para
// não violar o unique index parcial uq_responsavel_principal_por_atleta).
func (r *PgxResponsavelRepository) SaveWithPrincipalSwap(ctx context.Context, resp *atleta.Responsavel) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("iniciar transação: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	qtx := r.queries.WithTx(tx)

	if resp.ContatoPrincipal {
		if err := qtx.DespromoverPrincipalDoAtleta(ctx, resp.AtletaID); err != nil {
			return fmt.Errorf("despromover principal anterior: %w", err)
		}
	}

	if _, err := qtx.UpsertResponsavel(ctx, sqlcgen.UpsertResponsavelParams{
		ID:               resp.ID,
		AtletaID:         resp.AtletaID,
		Nome:             resp.Nome,
		Cpf:              resp.CPF,
		Email:            resp.Email,
		Telefone:         resp.Telefone,
		Parentesco:       string(resp.Parentesco),
		ContatoPrincipal: resp.ContatoPrincipal,
	}); err != nil {
		return fmt.Errorf("UpsertResponsavel: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transação: %w", err)
	}
	return nil
}

func (r *PgxResponsavelRepository) Delete(ctx context.Context, id uuid.UUID) error {
	if err := r.queries.DeleteResponsavel(ctx, id); err != nil {
		return fmt.Errorf("DeleteResponsavel: %w", err)
	}
	return nil
}

func toResponsavelEntity(row sqlcgen.Responsavel) *atleta.Responsavel {
	return &atleta.Responsavel{
		ID:               row.ID,
		AtletaID:         row.AtletaID,
		Nome:             row.Nome,
		CPF:              row.Cpf,
		Email:            row.Email,
		Telefone:         row.Telefone,
		Parentesco:       atleta.Parentesco(row.Parentesco),
		ContatoPrincipal: row.ContatoPrincipal,
		CriadoEm:         row.CriadoEm,
		AtualizadoEm:     row.AtualizadoEm,
	}
}
