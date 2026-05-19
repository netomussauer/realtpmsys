package financeiro

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGeradorMensalidadeService_Gerar(t *testing.T) {
	contrato := &Contrato{
		ID:              uuid.New(),
		AtletaID:        uuid.New(),
		PlanoID:         uuid.New(),
		ValorContratado: decimal.NewFromFloat(200.00),
	}
	svc := &GeradorMensalidadeService{}

	m := svc.Gerar(contrato, 10, 2026, 5)

	require.NotNil(t, m)
	assert.NotEqual(t, uuid.Nil, m.ID)
	assert.Equal(t, contrato.ID, m.ContratoID)
	assert.Equal(t, contrato.AtletaID, m.AtletaID)
	assert.Equal(t, 2026, m.CompetenciaAno)
	assert.Equal(t, 5, m.CompetenciaMes)
	assert.Equal(t, MensalidadePendente, m.Status)
	assert.True(t, contrato.ValorContratado.Equal(m.Valor), "valor deve vir do contrato")
	assert.Equal(t, time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC), m.DataVencimento)
	assert.False(t, m.CriadoEm.IsZero())
}

func TestCalcularDataVencimento(t *testing.T) {
	tests := []struct {
		name             string
		ano, mes, diaVen int
		want             time.Time
	}{
		{
			name: "dia normal no meio do mês",
			ano:  2026, mes: 5, diaVen: 10,
			want: time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC),
		},
		{
			name: "dia 28 em fevereiro não-bissexto",
			ano:  2026, mes: 2, diaVen: 28,
			want: time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC),
		},
		{
			name: "dia 31 em fevereiro ajusta para 28",
			ano:  2026, mes: 2, diaVen: 31,
			want: time.Date(2026, 2, 28, 0, 0, 0, 0, time.UTC),
		},
		{
			name: "dia 31 em fevereiro bissexto ajusta para 29",
			ano:  2028, mes: 2, diaVen: 31, // 2028 é bissexto
			want: time.Date(2028, 2, 29, 0, 0, 0, 0, time.UTC),
		},
		{
			name: "dia 31 em abril (30 dias) ajusta para 30",
			ano:  2026, mes: 4, diaVen: 31,
			want: time.Date(2026, 4, 30, 0, 0, 0, 0, time.UTC),
		},
		{
			name: "dia 31 em mês com 31 dias mantém",
			ano:  2026, mes: 7, diaVen: 31,
			want: time.Date(2026, 7, 31, 0, 0, 0, 0, time.UTC),
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := calcularDataVencimento(tc.ano, tc.mes, tc.diaVen)
			assert.Equal(t, tc.want, got)
		})
	}
}

func TestCalcularResumo(t *testing.T) {
	dec := decimal.NewFromFloat

	t.Run("lista vazia retorna zeros", func(t *testing.T) {
		r := CalcularResumo(nil)
		assert.True(t, r.TotalPendente.IsZero())
		assert.True(t, r.TotalVencido.IsZero())
		assert.True(t, r.TotalPago.IsZero())
	})

	t.Run("mistura de status agrega corretamente", func(t *testing.T) {
		pago := dec(200)
		ms := []*Mensalidade{
			{Status: MensalidadePendente, Valor: dec(150)},
			{Status: MensalidadePendente, Valor: dec(100)},
			{Status: MensalidadeVencido, Valor: dec(300)},
			{Status: MensalidadePago, Valor: dec(200), ValorPago: &pago},
			{Status: MensalidadeCancelado, Valor: dec(500)}, // ignorado
			{Status: MensalidadeIsento, Valor: dec(999)},    // ignorado
		}
		r := CalcularResumo(ms)
		assert.True(t, r.TotalPendente.Equal(dec(250)), "pendente: 150+100")
		assert.True(t, r.TotalVencido.Equal(dec(300)))
		assert.True(t, r.TotalPago.Equal(dec(200)))
	})

	t.Run("PAGO sem valor_pago nao conta no total_pago", func(t *testing.T) {
		ms := []*Mensalidade{
			{Status: MensalidadePago, Valor: dec(200), ValorPago: nil},
		}
		r := CalcularResumo(ms)
		assert.True(t, r.TotalPago.IsZero())
	})
}
