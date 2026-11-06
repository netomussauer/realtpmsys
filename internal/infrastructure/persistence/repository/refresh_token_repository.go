package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

// PgxRefreshTokenRepository implementa identidade.RefreshTokenRepository.
type PgxRefreshTokenRepository struct {
	queries *sqlcgen.Queries
}

func NewPgxRefreshTokenRepository(pool *pgxpool.Pool) *PgxRefreshTokenRepository {
	return &PgxRefreshTokenRepository{queries: sqlcgen.New(pool)}
}

func (r *PgxRefreshTokenRepository) Save(ctx context.Context, t *identidade.RefreshToken) error {
	err := r.queries.InsertRefreshToken(ctx, sqlcgen.InsertRefreshTokenParams{
		ID:        t.ID,
		UsuarioID: t.UsuarioID,
		FamiliaID: t.FamiliaID,
		TokenHash: t.TokenHash,
		ExpiraEm:  t.ExpiraEm,
		CriadoEm:  t.CriadoEm,
	})
	if err != nil {
		return fmt.Errorf("InsertRefreshToken: %w", err)
	}
	return nil
}

func (r *PgxRefreshTokenRepository) GetByHash(ctx context.Context, hash string) (*identidade.RefreshToken, error) {
	row, err := r.queries.GetRefreshTokenByHash(ctx, hash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetRefreshTokenByHash: %w", err)
	}
	return &identidade.RefreshToken{
		ID:         row.ID,
		UsuarioID:  row.UsuarioID,
		FamiliaID:  row.FamiliaID,
		TokenHash:  row.TokenHash,
		ExpiraEm:   row.ExpiraEm,
		RevogadoEm: row.RevogadoEm,
		CriadoEm:   row.CriadoEm,
	}, nil
}

func (r *PgxRefreshTokenRepository) Revogar(ctx context.Context, id uuid.UUID) error {
	if err := r.queries.RevogarRefreshToken(ctx, id); err != nil {
		return fmt.Errorf("RevogarRefreshToken: %w", err)
	}
	return nil
}

func (r *PgxRefreshTokenRepository) RevogarFamilia(ctx context.Context, familiaID uuid.UUID) error {
	if err := r.queries.RevogarRefreshTokensDaFamilia(ctx, familiaID); err != nil {
		return fmt.Errorf("RevogarRefreshTokensDaFamilia: %w", err)
	}
	return nil
}

func (r *PgxRefreshTokenRepository) RevogarTodosDoUsuario(ctx context.Context, usuarioID uuid.UUID) error {
	if err := r.queries.RevogarRefreshTokensDoUsuario(ctx, usuarioID); err != nil {
		return fmt.Errorf("RevogarRefreshTokensDoUsuario: %w", err)
	}
	return nil
}

func (r *PgxRefreshTokenRepository) RevogarTodosDoUsuarioExceto(ctx context.Context, usuarioID, familiaID uuid.UUID) error {
	err := r.queries.RevogarRefreshTokensDoUsuarioExceto(ctx, sqlcgen.RevogarRefreshTokensDoUsuarioExcetoParams{
		UsuarioID: usuarioID,
		FamiliaID: familiaID,
	})
	if err != nil {
		return fmt.Errorf("RevogarRefreshTokensDoUsuarioExceto: %w", err)
	}
	return nil
}

func (r *PgxRefreshTokenRepository) RevogarSeAtivo(ctx context.Context, id uuid.UUID) (bool, error) {
	n, err := r.queries.RevogarRefreshTokenSeAtivo(ctx, id)
	if err != nil {
		return false, fmt.Errorf("RevogarRefreshTokenSeAtivo: %w", err)
	}
	return n == 1, nil
}
