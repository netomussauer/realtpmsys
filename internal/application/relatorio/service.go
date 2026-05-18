package relatorio

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Repository é o Port — a infraestrutura implementa via pgx/sqlc.
type Repository interface {
	Inadimplencia(ctx context.Context, ano, mes *int) (RelatorioInadimplencia, error)
	FrequenciaAtleta(ctx context.Context, atletaID uuid.UUID, dataInicio, dataFim time.Time) (FrequenciaAtleta, error)
	FrequenciaTurma(ctx context.Context, turmaID uuid.UUID, dataInicio, dataFim time.Time) (RelatorioFrequenciaTurma, error)
}

// Service expõe os casos de uso de relatórios.
// Mantém regras simples (cálculo de taxa de presença) fora do repo.
type Service struct {
	repo Repository
}

func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Inadimplencia(ctx context.Context, ano, mes *int) (RelatorioInadimplencia, error) {
	return s.repo.Inadimplencia(ctx, ano, mes)
}

func (s *Service) FrequenciaAtleta(ctx context.Context, atletaID uuid.UUID, dataInicio, dataFim time.Time) (FrequenciaAtleta, error) {
	if dataFim.Before(dataInicio) {
		return FrequenciaAtleta{}, fmt.Errorf("data_fim deve ser >= data_inicio")
	}
	f, err := s.repo.FrequenciaAtleta(ctx, atletaID, dataInicio, dataFim)
	if err != nil {
		return FrequenciaAtleta{}, err
	}
	f.TaxaPresencaPC = calcularTaxaPresenca(f.Presentes, f.Total)
	return f, nil
}

func (s *Service) FrequenciaTurma(ctx context.Context, turmaID uuid.UUID, dataInicio, dataFim time.Time) (RelatorioFrequenciaTurma, error) {
	if dataFim.Before(dataInicio) {
		return RelatorioFrequenciaTurma{}, fmt.Errorf("data_fim deve ser >= data_inicio")
	}
	r, err := s.repo.FrequenciaTurma(ctx, turmaID, dataInicio, dataFim)
	if err != nil {
		return RelatorioFrequenciaTurma{}, err
	}
	for i := range r.Itens {
		r.Itens[i].TaxaPresencaPC = calcularTaxaPresenca(r.Itens[i].Presentes, r.Itens[i].Total)
	}
	return r, nil
}

// calcularTaxaPresenca retorna 0..100 (%).
// Considera PRESENTE como única presença efetiva (JUSTIFICADO não conta para taxa).
func calcularTaxaPresenca(presentes, total int64) float64 {
	if total == 0 {
		return 0
	}
	return float64(presentes) / float64(total) * 100.0
}
