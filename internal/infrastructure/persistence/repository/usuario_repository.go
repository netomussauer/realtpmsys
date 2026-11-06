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

// maxPaginaContas limita o parâmetro `page` da listagem de contas.
const maxPaginaContas = 100000

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
	// Teto de página: sem ele, (page-1)*perPage estoura int32 e vira OFFSET
	// negativo (500). 100000 páginas × 100 cabe folgado em int32.
	if page > maxPaginaContas {
		page = maxPaginaContas
	}

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

// contasLockKey é a chave do advisory lock que serializa as operações de
// conta (valor arbitrário e fixo; só precisa ser único entre os usos de
// pg_advisory_xact_lock neste banco).
const contasLockKey int64 = 0x7265616c74706d01

func (r *PgxUsuarioRepository) Modificar(
	ctx context.Context,
	id uuid.UUID,
	fn func(ctx context.Context, u *identidade.Usuario, tx identidade.ContaTx) error,
) (*identidade.Usuario, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("iniciar transação: %w", err)
	}
	// Rollback após Commit é no-op (ErrTxClosed); cobre todos os retornos de erro.
	defer func() { _ = tx.Rollback(ctx) }()

	if _, err := tx.Exec(ctx, "SELECT pg_advisory_xact_lock($1)", contasLockKey); err != nil {
		return nil, fmt.Errorf("lock de contas: %w", err)
	}
	q := r.queries.WithTx(tx)

	row, err := q.GetUsuarioByIDForUpdate(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, shared.ErrNotFound
		}
		return nil, fmt.Errorf("GetUsuarioByIDForUpdate: %w", err)
	}
	u := toUsuarioEntity(row)

	if err := fn(ctx, u, &contaTx{q: q}); err != nil {
		return nil, err
	}

	var nome *string
	if u.Nome != "" {
		n := u.Nome
		nome = &n
	}
	if _, err := q.UpsertUsuario(ctx, sqlcgen.UpsertUsuarioParams{
		ID:              u.ID,
		Email:           u.Email,
		Nome:            nome,
		SenhaHash:       u.SenhaHash,
		Perfil:          string(u.Perfil),
		Ativo:           u.Ativo,
		DeveTrocarSenha: u.DeveTrocarSenha,
	}); err != nil {
		return nil, fmt.Errorf("UpsertUsuario: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit: %w", err)
	}
	return u, nil
}

// contaTx implementa identidade.ContaTx sobre as queries da transação aberta
// por Modificar.
type contaTx struct{ q *sqlcgen.Queries }

func (t *contaTx) ContarAdminsAtivos(ctx context.Context) (int64, error) {
	n, err := t.q.CountAdminsAtivos(ctx)
	if err != nil {
		return 0, fmt.Errorf("CountAdminsAtivos: %w", err)
	}
	return n, nil
}

func (t *contaTx) RevogarTokensDoUsuario(ctx context.Context, usuarioID uuid.UUID) error {
	if err := t.q.RevogarRefreshTokensDoUsuario(ctx, usuarioID); err != nil {
		return fmt.Errorf("RevogarRefreshTokensDoUsuario: %w", err)
	}
	return nil
}

func (t *contaTx) RevogarTokensDoUsuarioExceto(ctx context.Context, usuarioID, familiaID uuid.UUID) error {
	err := t.q.RevogarRefreshTokensDoUsuarioExceto(ctx, sqlcgen.RevogarRefreshTokensDoUsuarioExcetoParams{
		UsuarioID: usuarioID,
		FamiliaID: familiaID,
	})
	if err != nil {
		return fmt.Errorf("RevogarRefreshTokensDoUsuarioExceto: %w", err)
	}
	return nil
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
