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

type PgxAtletaRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxAtletaRepository(pool *pgxpool.Pool) *PgxAtletaRepository {
	return &PgxAtletaRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxAtletaRepository) GetByID(ctx context.Context, id uuid.UUID) (*atleta.Atleta, error) {
	row, err := r.queries.GetAtletaByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetAtletaByID: %w", err)
	}
	return toAtletaEntity(row), nil
}

func (r *PgxAtletaRepository) GetByCPF(ctx context.Context, cpf string) (*atleta.Atleta, error) {
	row, err := r.queries.GetAtletaByCPF(ctx, &cpf)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetAtletaByCPF: %w", err)
	}
	return toAtletaEntity(row), nil
}

func (r *PgxAtletaRepository) List(ctx context.Context, f atleta.ListFilter) ([]*atleta.Atleta, int64, error) {
	page, perPage := normalizePagination(f.Page, f.PerPage)

	listParams := sqlcgen.ListAtletasParams{
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

	rows, err := r.queries.ListAtletas(ctx, listParams)
	if err != nil {
		return nil, 0, fmt.Errorf("ListAtletas: %w", err)
	}

	total, err := r.queries.CountAtletas(ctx, sqlcgen.CountAtletasParams{
		Nome:   listParams.Nome,
		Status: listParams.Status,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("CountAtletas: %w", err)
	}

	result := make([]*atleta.Atleta, len(rows))
	for i, row := range rows {
		result[i] = toAtletaEntity(row)
	}
	return result, total, nil
}

func (r *PgxAtletaRepository) Save(ctx context.Context, a *atleta.Atleta) error {
	_, err := r.queries.UpsertAtleta(ctx, sqlcgen.UpsertAtletaParams{
		ID:                   a.ID,
		Nome:                 a.Nome,
		DataNascimento:       a.DataNascimento,
		Cpf:                  a.CPF,
		Rg:                   a.RG,
		Endereco:             a.Endereco,
		Cidade:               a.Cidade,
		Uf:                   a.UF,
		Cep:                  a.CEP,
		Email:                a.Email,
		Telefone:             a.Telefone,
		Status:               string(a.Status),
		UsuarioResponsavelID: a.UsuarioResponsavelID,
	})
	if err != nil {
		return fmt.Errorf("UpsertAtleta: %w", err)
	}
	return nil
}

func (r *PgxAtletaRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	if err := r.queries.SoftDeleteAtleta(ctx, id); err != nil {
		return fmt.Errorf("SoftDeleteAtleta: %w", err)
	}
	return nil
}

func toAtletaEntity(row sqlcgen.Atleta) *atleta.Atleta {
	return &atleta.Atleta{
		ID:                   row.ID,
		Nome:                 row.Nome,
		DataNascimento:       row.DataNascimento,
		CPF:                  row.Cpf,
		RG:                   row.Rg,
		Endereco:             row.Endereco,
		Cidade:               row.Cidade,
		UF:                   row.Uf,
		CEP:                  row.Cep,
		Email:                row.Email,
		Telefone:             row.Telefone,
		Status:               atleta.Status(row.Status),
		UsuarioResponsavelID: row.UsuarioResponsavelID,
		CriadoEm:             row.CriadoEm,
		AtualizadoEm:         row.AtualizadoEm,
		DeletadoEm:           row.DeletadoEm,
	}
}
