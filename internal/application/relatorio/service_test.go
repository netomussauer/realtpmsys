package relatorio

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCalcularTaxaPresenca(t *testing.T) {
	tests := []struct {
		name      string
		presentes int64
		total     int64
		want      float64
	}{
		{"total zero retorna 0", 0, 0, 0.0},
		{"100% de presença", 10, 10, 100.0},
		{"50% de presença", 5, 10, 50.0},
		{"0% de presença", 0, 10, 0.0},
		{"presentes > total (caso degenerado)", 11, 10, 110.0},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := calcularTaxaPresenca(tc.presentes, tc.total)
			assert.InDelta(t, tc.want, got, 0.0001)
		})
	}
}

// fakeRepo é um stub do Repository que retorna valores fixos e captura
// os parâmetros recebidos para asserts.
type fakeRepo struct {
	frequenciaAtletaResp FrequenciaAtleta
	frequenciaTurmaResp  RelatorioFrequenciaTurma
	inadimplenciaResp    RelatorioInadimplencia

	gotAtletaID  uuid.UUID
	gotTurmaID   uuid.UUID
	gotInicio    time.Time
	gotFim       time.Time
	gotAno       *int
	gotMes       *int

	errFreqAtleta error
	errFreqTurma  error
}

func (f *fakeRepo) Inadimplencia(_ context.Context, ano, mes *int) (RelatorioInadimplencia, error) {
	f.gotAno, f.gotMes = ano, mes
	return f.inadimplenciaResp, nil
}
func (f *fakeRepo) FrequenciaAtleta(_ context.Context, atletaID uuid.UUID, di, df time.Time) (FrequenciaAtleta, error) {
	f.gotAtletaID, f.gotInicio, f.gotFim = atletaID, di, df
	return f.frequenciaAtletaResp, f.errFreqAtleta
}
func (f *fakeRepo) FrequenciaTurma(_ context.Context, turmaID uuid.UUID, di, df time.Time) (RelatorioFrequenciaTurma, error) {
	f.gotTurmaID, f.gotInicio, f.gotFim = turmaID, di, df
	return f.frequenciaTurmaResp, f.errFreqTurma
}

func TestService_FrequenciaAtleta(t *testing.T) {
	ctx := context.Background()
	atletaID := uuid.New()
	di := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	df := time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC)

	t.Run("calcula taxa de presença", func(t *testing.T) {
		repo := &fakeRepo{
			frequenciaAtletaResp: FrequenciaAtleta{
				Presentes: 8, Ausentes: 2, Justificados: 0, Total: 10,
			},
		}
		svc := NewService(repo)
		out, err := svc.FrequenciaAtleta(ctx, atletaID, di, df)
		require.NoError(t, err)
		assert.InDelta(t, 80.0, out.TaxaPresencaPC, 0.0001)
		assert.Equal(t, atletaID, repo.gotAtletaID, "deve repassar atleta_id ao repo")
	})

	t.Run("data_fim antes de data_inicio rejeita", func(t *testing.T) {
		repo := &fakeRepo{}
		svc := NewService(repo)
		_, err := svc.FrequenciaAtleta(ctx, atletaID, df, di) // invertido
		require.Error(t, err)
	})

	t.Run("propaga erro do repo", func(t *testing.T) {
		repo := &fakeRepo{errFreqAtleta: errors.New("db down")}
		svc := NewService(repo)
		_, err := svc.FrequenciaAtleta(ctx, atletaID, di, df)
		require.Error(t, err)
	})
}

func TestService_FrequenciaTurma(t *testing.T) {
	ctx := context.Background()
	turmaID := uuid.New()
	di := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
	df := time.Date(2026, 5, 31, 0, 0, 0, 0, time.UTC)

	t.Run("calcula taxa por atleta", func(t *testing.T) {
		repo := &fakeRepo{
			frequenciaTurmaResp: RelatorioFrequenciaTurma{
				TurmaID:      turmaID,
				TotalTreinos: 10,
				Itens: []ItemFrequenciaTurma{
					{AtletaID: uuid.New(), AtletaNome: "A", Presentes: 10, Total: 10},
					{AtletaID: uuid.New(), AtletaNome: "B", Presentes: 5, Total: 10},
					{AtletaID: uuid.New(), AtletaNome: "C", Presentes: 0, Total: 0}, // sem registros
				},
			},
		}
		svc := NewService(repo)
		out, err := svc.FrequenciaTurma(ctx, turmaID, di, df)
		require.NoError(t, err)
		require.Len(t, out.Itens, 3)
		assert.InDelta(t, 100.0, out.Itens[0].TaxaPresencaPC, 0.0001)
		assert.InDelta(t, 50.0, out.Itens[1].TaxaPresencaPC, 0.0001)
		assert.InDelta(t, 0.0, out.Itens[2].TaxaPresencaPC, 0.0001, "total=0 vira 0%")
	})

	t.Run("data_fim antes de data_inicio rejeita", func(t *testing.T) {
		repo := &fakeRepo{}
		svc := NewService(repo)
		_, err := svc.FrequenciaTurma(ctx, turmaID, df, di)
		require.Error(t, err)
	})

	t.Run("propaga erro do repo", func(t *testing.T) {
		repo := &fakeRepo{errFreqTurma: errors.New("db down")}
		svc := NewService(repo)
		_, err := svc.FrequenciaTurma(ctx, turmaID, di, df)
		require.Error(t, err)
	})
}

func TestService_Inadimplencia(t *testing.T) {
	ctx := context.Background()
	t.Run("propaga filtros ano/mes para o repo", func(t *testing.T) {
		repo := &fakeRepo{}
		svc := NewService(repo)
		ano, mes := 2026, 5
		_, err := svc.Inadimplencia(ctx, &ano, &mes)
		require.NoError(t, err)
		require.NotNil(t, repo.gotAno)
		assert.Equal(t, 2026, *repo.gotAno)
		require.NotNil(t, repo.gotMes)
		assert.Equal(t, 5, *repo.gotMes)
	})
	t.Run("sem filtros propaga nil", func(t *testing.T) {
		repo := &fakeRepo{}
		svc := NewService(repo)
		_, err := svc.Inadimplencia(ctx, nil, nil)
		require.NoError(t, err)
		assert.Nil(t, repo.gotAno)
		assert.Nil(t, repo.gotMes)
	})
}
