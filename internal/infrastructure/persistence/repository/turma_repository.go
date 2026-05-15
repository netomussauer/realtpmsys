package repository

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	domainturma "github.com/realtpmsys/realtpmsys/internal/domain/turma"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

type PgxTurmaRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxTurmaRepository(pool *pgxpool.Pool) *PgxTurmaRepository {
	return &PgxTurmaRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

func (r *PgxTurmaRepository) GetByID(ctx context.Context, id uuid.UUID) (*domainturma.Turma, error) {
	row, err := r.queries.GetTurmaByID(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("GetTurmaByID: %w", err)
	}
	t := toTurmaEntity(row)

	horarios, err := r.queries.ListHorariosPorTurma(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("ListHorariosPorTurma: %w", err)
	}
	t.Horarios = make([]domainturma.HorarioTurma, len(horarios))
	for i, h := range horarios {
		t.Horarios[i] = domainturma.HorarioTurma{
			ID:         h.ID,
			TurmaID:    h.TurmaID,
			DiaSemana:  domainturma.DiaSemana(h.DiaSemana),
			HoraInicio: pgTimeToString(h.HoraInicio),
			HoraFim:    pgTimeToString(h.HoraFim),
		}
	}
	return t, nil
}

func (r *PgxTurmaRepository) List(ctx context.Context, f domainturma.TurmaListFilter) ([]*domainturma.Turma, int64, error) {
	page, perPage := normalizePagination(f.Page, f.PerPage)
	params := sqlcgen.ListTurmasParams{
		Lim: int32(perPage),
		Off: int32((page - 1) * perPage),
	}
	if f.Nome != "" {
		n := f.Nome
		params.Nome = &n
	}
	if f.Status != nil {
		s := string(*f.Status)
		params.Status = &s
	}
	rows, err := r.queries.ListTurmas(ctx, params)
	if err != nil {
		return nil, 0, fmt.Errorf("ListTurmas: %w", err)
	}
	total, err := r.queries.CountTurmas(ctx, sqlcgen.CountTurmasParams{
		Nome:   params.Nome,
		Status: params.Status,
	})
	if err != nil {
		return nil, 0, fmt.Errorf("CountTurmas: %w", err)
	}
	result := make([]*domainturma.Turma, len(rows))
	for i, row := range rows {
		result[i] = toTurmaEntity(row)
	}
	return result, total, nil
}

// Save persiste turma + horários numa única transação.
// Estratégia: upsert da turma → delete horários antigos → insert horários atuais.
func (r *PgxTurmaRepository) Save(ctx context.Context, t *domainturma.Turma) error {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("iniciar transação: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	qtx := r.queries.WithTx(tx)

	if _, err := qtx.UpsertTurma(ctx, sqlcgen.UpsertTurmaParams{
		ID:             t.ID,
		Nome:           t.Nome,
		FaixaEtariaMin: int32(t.FaixaEtariaMin),
		FaixaEtariaMax: int32(t.FaixaEtariaMax),
		CapacidadeMax:  int32(t.CapacidadeMax),
		TreinadorID:    t.TreinadorID,
		CampoID:        t.CampoID,
		Status:         string(t.Status),
	}); err != nil {
		return fmt.Errorf("UpsertTurma: %w", err)
	}

	if err := qtx.DeleteHorariosByTurma(ctx, t.ID); err != nil {
		return fmt.Errorf("DeleteHorariosByTurma: %w", err)
	}
	for _, h := range t.Horarios {
		hi, err := stringToPgTime(h.HoraInicio)
		if err != nil {
			return fmt.Errorf("hora_inicio inválida (%s): %w", h.HoraInicio, err)
		}
		hf, err := stringToPgTime(h.HoraFim)
		if err != nil {
			return fmt.Errorf("hora_fim inválida (%s): %w", h.HoraFim, err)
		}
		id := h.ID
		if id == uuid.Nil {
			id = uuid.New()
		}
		if err := qtx.InsertHorarioTurma(ctx, sqlcgen.InsertHorarioTurmaParams{
			ID:         id,
			TurmaID:    t.ID,
			DiaSemana:  string(h.DiaSemana),
			HoraInicio: hi,
			HoraFim:    hf,
		}); err != nil {
			return fmt.Errorf("InsertHorarioTurma: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit transação: %w", err)
	}
	return nil
}

func (r *PgxTurmaRepository) SoftDelete(ctx context.Context, id uuid.UUID) error {
	if err := r.queries.SoftDeleteTurma(ctx, id); err != nil {
		return fmt.Errorf("SoftDeleteTurma: %w", err)
	}
	return nil
}

func toTurmaEntity(row sqlcgen.Turma) *domainturma.Turma {
	return &domainturma.Turma{
		ID:             row.ID,
		Nome:           row.Nome,
		FaixaEtariaMin: int(row.FaixaEtariaMin),
		FaixaEtariaMax: int(row.FaixaEtariaMax),
		CapacidadeMax:  int(row.CapacidadeMax),
		TreinadorID:    row.TreinadorID,
		CampoID:        row.CampoID,
		Status:         domainturma.Status(row.Status),
		CriadoEm:       row.CriadoEm,
		AtualizadoEm:   row.AtualizadoEm,
		DeletadoEm:     row.DeletadoEm,
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers TIME (PostgreSQL TIME WITHOUT TIME ZONE ↔ "HH:MM")
// ─────────────────────────────────────────────────────────────────────────────

func stringToPgTime(s string) (pgtype.Time, error) {
	parts := strings.Split(s, ":")
	if len(parts) < 2 || len(parts) > 3 {
		return pgtype.Time{}, fmt.Errorf("formato esperado HH:MM ou HH:MM:SS")
	}
	h, err := strconv.Atoi(parts[0])
	if err != nil || h < 0 || h > 23 {
		return pgtype.Time{}, fmt.Errorf("hora inválida")
	}
	m, err := strconv.Atoi(parts[1])
	if err != nil || m < 0 || m > 59 {
		return pgtype.Time{}, fmt.Errorf("minuto inválido")
	}
	sec := 0
	if len(parts) == 3 {
		sec, err = strconv.Atoi(parts[2])
		if err != nil || sec < 0 || sec > 59 {
			return pgtype.Time{}, fmt.Errorf("segundo inválido")
		}
	}
	micro := int64(h*3600+m*60+sec) * 1_000_000
	return pgtype.Time{Microseconds: micro, Valid: true}, nil
}

func pgTimeToString(t pgtype.Time) string {
	if !t.Valid {
		return ""
	}
	secs := t.Microseconds / 1_000_000
	h := secs / 3600
	m := (secs % 3600) / 60
	return fmt.Sprintf("%02d:%02d", h, m)
}
