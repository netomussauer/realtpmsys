package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	apprel "github.com/realtpmsys/realtpmsys/internal/application/relatorio"
	sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

// PgxRelatorioRepository implementa application/relatorio.Repository.
type PgxRelatorioRepository struct {
	pool    *pgxpool.Pool
	queries *sqlcgen.Queries
}

func NewPgxRelatorioRepository(pool *pgxpool.Pool) *PgxRelatorioRepository {
	return &PgxRelatorioRepository{
		pool:    pool,
		queries: sqlcgen.New(pool),
	}
}

// Inadimplencia retorna mensalidades em atraso + resumo.
func (r *PgxRelatorioRepository) Inadimplencia(ctx context.Context, ano, mes *int) (apprel.RelatorioInadimplencia, error) {
	listParams := sqlcgen.ListInadimplenciaParams{}
	resumoParams := sqlcgen.ResumoInadimplenciaParams{}
	if ano != nil {
		v := int32(*ano)
		listParams.Ano = &v
		resumoParams.Ano = &v
	}
	if mes != nil {
		v := int32(*mes)
		listParams.Mes = &v
		resumoParams.Mes = &v
	}

	rows, err := r.queries.ListInadimplencia(ctx, listParams)
	if err != nil {
		return apprel.RelatorioInadimplencia{}, fmt.Errorf("ListInadimplencia: %w", err)
	}
	resumo, err := r.queries.ResumoInadimplencia(ctx, resumoParams)
	if err != nil {
		return apprel.RelatorioInadimplencia{}, fmt.Errorf("ResumoInadimplencia: %w", err)
	}

	itens := make([]apprel.ItemInadimplencia, len(rows))
	for i, row := range rows {
		itens[i] = apprel.ItemInadimplencia{
			MensalidadeID:  row.ID,
			AtletaID:       row.AtletaID,
			AtletaNome:     row.AtletaNome,
			AtletaTelefone: row.AtletaTelefone,
			AtletaEmail:    row.AtletaEmail,
			CompetenciaAno: int(row.CompetenciaAno),
			CompetenciaMes: int(row.CompetenciaMes),
			DataVencimento: row.DataVencimento,
			Valor:          row.Valor,
			Status:         row.Status,
			DiasEmAtraso:   int(row.DiasEmAtraso),
		}
	}

	return apprel.RelatorioInadimplencia{
		Itens: itens,
		Resumo: apprel.ResumoInadimplencia{
			TotalMensalidades: resumo.TotalMensalidades,
			TotalAtletas:      resumo.TotalAtletas,
			TotalDevido:       resumo.TotalDevido,
		},
	}, nil
}

// FrequenciaAtleta retorna o agregado de presenças do atleta no período.
func (r *PgxRelatorioRepository) FrequenciaAtleta(ctx context.Context, atletaID uuid.UUID, dataInicio, dataFim time.Time) (apprel.FrequenciaAtleta, error) {
	row, err := r.queries.FrequenciaAtleta(ctx, sqlcgen.FrequenciaAtletaParams{
		AtletaID:   atletaID,
		DataInicio: dataInicio,
		DataFim:    dataFim,
	})
	if err != nil {
		return apprel.FrequenciaAtleta{}, fmt.Errorf("FrequenciaAtleta: %w", err)
	}
	return apprel.FrequenciaAtleta{
		Presentes:    row.Presentes,
		Ausentes:     row.Ausentes,
		Justificados: row.Justificados,
		Total:        row.Total,
	}, nil
}

// FrequenciaTurma retorna a frequência consolidada por atleta + total de treinos.
func (r *PgxRelatorioRepository) FrequenciaTurma(ctx context.Context, turmaID uuid.UUID, dataInicio, dataFim time.Time) (apprel.RelatorioFrequenciaTurma, error) {
	totalTreinos, err := r.queries.TotalTreinosTurma(ctx, sqlcgen.TotalTreinosTurmaParams{
		TurmaID:    turmaID,
		DataInicio: dataInicio,
		DataFim:    dataFim,
	})
	if err != nil {
		return apprel.RelatorioFrequenciaTurma{}, fmt.Errorf("TotalTreinosTurma: %w", err)
	}
	rows, err := r.queries.FrequenciaTurmaPorAtleta(ctx, sqlcgen.FrequenciaTurmaPorAtletaParams{
		TurmaID:    turmaID,
		DataInicio: dataInicio,
		DataFim:    dataFim,
	})
	if err != nil {
		return apprel.RelatorioFrequenciaTurma{}, fmt.Errorf("FrequenciaTurmaPorAtleta: %w", err)
	}
	itens := make([]apprel.ItemFrequenciaTurma, len(rows))
	for i, row := range rows {
		itens[i] = apprel.ItemFrequenciaTurma{
			AtletaID:     row.AtletaID,
			AtletaNome:   row.AtletaNome,
			Presentes:    row.Presentes,
			Ausentes:     row.Ausentes,
			Justificados: row.Justificados,
			Total:        row.Total,
		}
	}
	return apprel.RelatorioFrequenciaTurma{
		TurmaID:      turmaID,
		TotalTreinos: totalTreinos,
		Itens:        itens,
	}, nil
}
