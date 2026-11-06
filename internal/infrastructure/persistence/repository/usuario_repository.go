package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

// pgUniqueViolation é o SQLSTATE de violação de UNIQUE no PostgreSQL.
const pgUniqueViolation = "23505"

// PgxUsuarioRepository implementa identidade.Repository e identidade.ContaRepository.
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

func (r *PgxUsuarioRepository) GetByID(ctx context.Context, id uuid.UUID) (*identidade.Usuario, error) {
	row, err := r.queries.GetUsuarioByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetUsuarioByID: %w", err)
	}
	return toUsuarioEntity(row), nil
}

func (r *PgxUsuarioRepository) List(ctx context.Context, f identidade.ListFilter) ([]*identidade.Usuario, int64, error) {
	page, perPage := normalizePagination(f.Page, f.PerPage)

	var busca, perfil *string
	if f.Busca != "" {
		b := f.Busca
		busca = &b
	}
	if f.Perfil != nil {
		p := string(*f.Perfil)
		perfil = &p
	}

	rows, err := r.queries.ListUsuarios(ctx, sqlcgen.ListUsuariosParams{
		Busca:  busca,
		Perfil: perfil,
		Ativo:  f.Ativo,
		Lim:    int32(perPage),
		Off:    int32((page - 1) * perPage),
	})
	if err != nil {
		return nil, 0, fmt.Errorf("ListUsuarios: %w", err)
	}
	total, err := r.queries.CountUsuarios(ctx, sqlcgen.CountUsuariosParams{
		Busca:  busca,
		Perfil: perfil,
		Ativo:  f.Ativo,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("CountUsuarios: %w", err)
	}

	result := make([]*identidade.Usuario, len(rows))
	for i, row := range rows {
		result[i] = toUsuarioEntity(row)
	}
	return result, total, nil
}

func (r *PgxUsuarioRepository) Save(ctx context.Context, u *identidade.Usuario) error {
	var nome *string
	if u.Nome != "" {
		n := u.Nome
		nome = &n
	}
	_, err := r.queries.UpsertUsuario(ctx, sqlcgen.UpsertUsuarioParams{
		ID:              u.ID,
		Email:           u.Email,
		Nome:            nome,
		SenhaHash:       u.SenhaHash,
		Perfil:          string(u.Perfil),
		Ativo:           u.Ativo,
		DeveTrocarSenha: u.DeveTrocarSenha,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == pgUniqueViolation {
			return shared.ErrEmailEmUso
		}
		return fmt.Errorf("UpsertUsuario: %w", err)
	}
	return nil
}

func (r *PgxUsuarioRepository) ContarAdminsAtivos(ctx context.Context) (int64, error) {
	n, err := r.queries.CountAdminsAtivos(ctx)
	if err != nil {
		return 0, fmt.Errorf("CountAdminsAtivos: %w", err)
	}
	return n, nil
}

func toUsuarioEntity(row sqlcgen.Usuario) *identidade.Usuario {
	u := &identidade.Usuario{
		ID:              row.ID,
		Email:           row.Email,
		SenhaHash:       row.SenhaHash,
		Perfil:          identidade.Perfil(row.Perfil),
		Ativo:           row.Ativo,
		DeveTrocarSenha: row.DeveTrocarSenha,
		CriadoEm:        row.CriadoEm,
		AtualizadoEm:    row.AtualizadoEm,
		DeletadoEm:      row.DeletadoEm,
	}
	if row.Nome != nil {
		u.Nome = *row.Nome
	}
	return u
}
