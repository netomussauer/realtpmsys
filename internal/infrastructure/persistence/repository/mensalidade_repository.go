// Package repository contém os Adapters de persistência.
// Implementa as interfaces (Ports) definidas no domínio usando pgx + sqlc.
package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

// PgxMensalidadeRepository implementa financeiro.MensalidadeRepository com pgx + sqlc.
type PgxMensalidadeRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxMensalidadeRepository(pool *pgxpool.Pool) *PgxMensalidadeRepository {
	return &PgxMensalidadeRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

// GetByID busca uma mensalidade pelo ID. Retorna nil se não encontrada.
func (r *PgxMensalidadeRepository) GetByID(ctx context.Context, id uuid.UUID) (*financeiro.Mensalidade, error) {
	row, err := r.queries.GetMensalidadeByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetMensalidadeByID: %w", err)
	}
	return toMensalidadeEntity(row), nil
}

// GetByContratoCompetencia busca mensalidade por contrato + competência (idempotência).
func (r *PgxMensalidadeRepository) GetByContratoCompetencia(
	ctx context.Context, contratoID uuid.UUID, ano, mes int,
) (*financeiro.Mensalidade, error) {
	row, err := r.queries.GetMensalidadeByContratoCompetencia(ctx, sqlcgen.GetMensalidadeByContratoCompetenciaParams{
		ContratoID:     contratoID,
		CompetenciaAno: int32(ano),
		CompetenciaMes: int32(mes),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetMensalidadeByContratoCompetencia: %w", err)
	}
	return toMensalidadeEntity(row), nil
}

// List retorna mensalidades paginadas com filtros opcionais.
func (r *PgxMensalidadeRepository) List(
	ctx context.Context, f financeiro.MensalidadeFilter,
) ([]*financeiro.Mensalidade, int64, error) {
	page, perPage := normalizePagination(f.Page, f.PerPage)

	params := sqlcgen.ListMensalidadesParams{
		Lim: int32(perPage),
		Off: int32((page - 1) * perPage),
	}
	if f.AtletaID != nil {
		params.AtletaID = f.AtletaID
	}
	if f.Status != nil {
		s := string(*f.Status)
		params.Status = &s
	}
	if f.CompetenciaAno != nil {
		v := int32(*f.CompetenciaAno)
		params.CompAno = &v
	}
	if f.CompetenciaMes != nil {
		v := int32(*f.CompetenciaMes)
		params.CompMes = &v
	}

	rows, err := r.queries.ListMensalidades(ctx, params)
	if err != nil {
		return nil, 0, fmt.Errorf("ListMensalidades: %w", err)
	}

	total, err := r.queries.CountMensalidades(ctx, sqlcgen.CountMensalidadesParams{
		AtletaID: params.AtletaID,
		Status:   params.Status,
		CompAno:  params.CompAno,
		CompMes:  params.CompMes,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("CountMensalidades: %w", err)
	}

	result := make([]*financeiro.Mensalidade, len(rows))
	for i, row := range rows {
		result[i] = toMensalidadeEntity(row)
	}
	return result, total, nil
}

// Save persiste uma mensalidade (insert ou update por ID).
func (r *PgxMensalidadeRepository) Save(ctx context.Context, m *financeiro.Mensalidade) error {
	if m.Status == financeiro.MensalidadePago && m.ValorPago != nil {
		_, err := r.queries.UpdateMensalidadePagamento(ctx, sqlcgen.UpdateMensalidadePagamentoParams{
			ID:             m.ID,
			ValorPago:      m.ValorPago,
			DataPagamento:  m.DataPagamento,
			FormaPagamento: m.FormaPagamento,
			Observacao:     m.Observacao,
		})
		return err
	}
	// Atualiza apenas status (cancelar, marcar vencido)
	_, err := r.queries.UpdateMensalidadeStatus(ctx, sqlcgen.UpdateMensalidadeStatusParams{
		ID:     m.ID,
		Status: string(m.Status),
	})
	return err
}

// SaveBatch persiste múltiplas mensalidades novas em uma única transação.
func (r *PgxMensalidadeRepository) SaveBatch(ctx context.Context, mensalidades []*financeiro.Mensalidade) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("iniciar transação: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	qtx := r.queries.WithTx(tx)
	for _, m := range mensalidades {
		status := string(m.Status)
		_, err := qtx.InsertMensalidade(ctx, sqlcgen.InsertMensalidadeParams{
			ID:             m.ID,
			ContratoID:     m.ContratoID,
			AtletaID:       m.AtletaID,
			CompetenciaAno: int32(m.CompetenciaAno),
			CompetenciaMes: int32(m.CompetenciaMes),
			DataVencimento: m.DataVencimento,
			Valor:          m.Valor,
			Status:         status,
		})
		if err != nil {
			return fmt.Errorf("inserir mensalidade %s: %w", m.ID, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transação: %w", err)
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapeamento sqlc → entidade de domínio
// ─────────────────────────────────────────────────────────────────────────────

func toMensalidadeEntity(row sqlcgen.Mensalidade) *financeiro.Mensalidade {
	_ = shared.ErrNotFound // garante que shared é usado (evita import cycle check)
	return &financeiro.Mensalidade{
		ID:             row.ID,
		ContratoID:     row.ContratoID,
		AtletaID:       row.AtletaID,
		CompetenciaAno: int(row.CompetenciaAno),
		CompetenciaMes: int(row.CompetenciaMes),
		DataVencimento: row.DataVencimento,
		Valor:          row.Valor,
		ValorPago:      row.ValorPago,
		Status:         financeiro.StatusMensalidade(row.Status),
		DataPagamento:  row.DataPagamento,
		FormaPagamento: row.FormaPagamento,
		Observacao:     row.Observacao,
		CriadoEm:      row.CriadoEm,
		AtualizadoEm:  row.AtualizadoEm,
	}
}

func normalizePagination(page, perPage int) (int, int) {
	if page < 1 {
		page = 1
	}
	if perPage < 1 || perPage > 100 {
		perPage = 20
	}
	return page, perPage
}
