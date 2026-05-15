package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

type PgxUsuarioRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxUsuarioRepository(pool *pgxpool.Pool) *PgxUsuarioRepository {
	return &PgxUsuarioRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxUsuarioRepository) GetByEmail(ctx context.Context, email string) (*identidade.Usuario, error) {
	row, err := r.queries.GetUsuarioByEmail(ctx, email)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetUsuarioByEmail: %w", err)
	}
	return toUsuarioEntity(row), nil
}

func toUsuarioEntity(row sqlcgen.Usuario) *identidade.Usuario {
	return &identidade.Usuario{
		ID:           row.ID,
		Email:        row.Email,
		SenhaHash:    row.SenhaHash,
		Perfil:       identidade.Perfil(row.Perfil),
		Ativo:        row.Ativo,
		CriadoEm:     row.CriadoEm,
		AtualizadoEm: row.AtualizadoEm,
		DeletadoEm:   row.DeletadoEm,
	}
}
