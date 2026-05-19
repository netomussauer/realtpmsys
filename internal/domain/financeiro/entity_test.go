package financeiro

import (
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// ─────────────────────────────────────────────────────────────────────────────
// PLANO
// ─────────────────────────────────────────────────────────────────────────────

func TestNewPlano(t *testing.T) {
	dec := decimal.NewFromFloat

	tests := []struct {
		name          string
		nome          string
		diasSemana    int
		valor         decimal.Decimal
		diaVencimento int
		wantErr       error
	}{
		{"válido 2x/semana", "Plano 2x", 2, dec(150), 10, nil},
		{"válido 3x/semana", "Plano 3x", 3, dec(200), 5, nil},
		{"válido 5x/semana", "Plano 5x", 5, dec(280), 28, nil},
		{"dias_semana 1 invalido", "X", 1, dec(150), 10, shared.ErrDiasSemanasInvalido},
		{"dias_semana 4 invalido", "X", 4, dec(150), 10, shared.ErrDiasSemanasInvalido},
		{"valor zero invalido", "X", 2, dec(0), 10, shared.ErrValorInvalido},
		{"valor negativo invalido", "X", 2, dec(-1), 10, shared.ErrValorInvalido},
		{"dia 0 invalido", "X", 2, dec(150), 0, shared.ErrDiaVencimentoInvalido},
		{"dia 29 invalido", "X", 2, dec(150), 29, shared.ErrDiaVencimentoInvalido},
		{"dia 28 valido (limite)", "X", 2, dec(150), 28, nil},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			p, err := NewPlano(tc.nome, tc.diasSemana, tc.valor, tc.diaVencimento)
			if tc.wantErr != nil {
				require.Error(t, err)
				assert.True(t, errors.Is(err, tc.wantErr), "esperava %v, got %v", tc.wantErr, err)
				assert.Nil(t, p)
				return
			}
			require.NoError(t, err)
			require.NotNil(t, p)
			assert.NotEqual(t, uuid.Nil, p.ID)
			assert.True(t, p.Ativo, "Plano novo deve nascer ATIVO")
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRATO
// ─────────────────────────────────────────────────────────────────────────────

func TestNewContrato(t *testing.T) {
	atletaID, planoID := uuid.New(), uuid.New()
	dataInicio := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)

	t.Run("válido", func(t *testing.T) {
		c, err := NewContrato(atletaID, planoID, dataInicio, decimal.NewFromInt(200))
		require.NoError(t, err)
		assert.Equal(t, ContratoAtivo, c.Status)
		assert.Equal(t, atletaID, c.AtletaID)
		assert.Equal(t, planoID, c.PlanoID)
		assert.Nil(t, c.DataFim)
	})
	t.Run("valor zero rejeitado", func(t *testing.T) {
		_, err := NewContrato(atletaID, planoID, dataInicio, decimal.Zero)
		require.ErrorIs(t, err, shared.ErrValorInvalido)
	})
}

func TestContrato_Cancelar(t *testing.T) {
	novo := func() *Contrato {
		c, _ := NewContrato(uuid.New(), uuid.New(), time.Now(), decimal.NewFromInt(200))
		return c
	}

	t.Run("ATIVO -> CANCELADO seta data_fim", func(t *testing.T) {
		c := novo()
		require.NoError(t, c.Cancelar())
		assert.Equal(t, ContratoCancelado, c.Status)
		require.NotNil(t, c.DataFim)
		assert.WithinDuration(t, time.Now(), *c.DataFim, 2*time.Second)
	})
	t.Run("CANCELADO -> nao cancela novamente", func(t *testing.T) {
		c := novo()
		require.NoError(t, c.Cancelar())
		err := c.Cancelar()
		require.Error(t, err)
		assert.ErrorIs(t, err, shared.ErrDomainViolation)
	})
}

// ─────────────────────────────────────────────────────────────────────────────
// MENSALIDADE — máquina de estados
// ─────────────────────────────────────────────────────────────────────────────

func novaMensalidadePendente() *Mensalidade {
	return &Mensalidade{
		ID:             uuid.New(),
		ContratoID:     uuid.New(),
		AtletaID:       uuid.New(),
		CompetenciaAno: 2026,
		CompetenciaMes: 5,
		DataVencimento: time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC),
		Valor:          decimal.NewFromInt(200),
		Status:         MensalidadePendente,
	}
}

func TestMensalidade_RegistrarPagamento(t *testing.T) {
	dec := decimal.NewFromFloat
	dataPag := time.Date(2026, 5, 15, 0, 0, 0, 0, time.UTC)

	t.Run("PENDENTE -> PAGO", func(t *testing.T) {
		m := novaMensalidadePendente()
		obs := "pago via PIX"
		err := m.RegistrarPagamento(dec(200), dataPag, "PIX", &obs)
		require.NoError(t, err)
		assert.Equal(t, MensalidadePago, m.Status)
		require.NotNil(t, m.ValorPago)
		assert.True(t, m.ValorPago.Equal(dec(200)))
		require.NotNil(t, m.DataPagamento)
		assert.Equal(t, dataPag, *m.DataPagamento)
		require.NotNil(t, m.FormaPagamento)
		assert.Equal(t, "PIX", *m.FormaPagamento)
		assert.Equal(t, &obs, m.Observacao)
	})
	t.Run("VENCIDO -> PAGO (deve aceitar)", func(t *testing.T) {
		m := novaMensalidadePendente()
		m.Status = MensalidadeVencido
		err := m.RegistrarPagamento(dec(200), dataPag, "BOLETO", nil)
		require.NoError(t, err)
		assert.Equal(t, MensalidadePago, m.Status)
	})
	t.Run("PAGO -> PAGO de novo (rejeita 409)", func(t *testing.T) {
		m := novaMensalidadePendente()
		require.NoError(t, m.RegistrarPagamento(dec(200), dataPag, "PIX", nil))
		err := m.RegistrarPagamento(dec(200), dataPag, "PIX", nil)
		require.Error(t, err)
		assert.ErrorIs(t, err, shared.ErrMensalidadeJaPaga)
	})
	t.Run("CANCELADO -> PAGO rejeita", func(t *testing.T) {
		m := novaMensalidadePendente()
		m.Status = MensalidadeCancelado
		err := m.RegistrarPagamento(dec(200), dataPag, "PIX", nil)
		require.Error(t, err)
		assert.ErrorIs(t, err, shared.ErrMensalidadeCancelada)
	})
}

func TestMensalidade_Cancelar(t *testing.T) {
	t.Run("PENDENTE -> CANCELADO", func(t *testing.T) {
		m := novaMensalidadePendente()
		require.NoError(t, m.Cancelar())
		assert.Equal(t, MensalidadeCancelado, m.Status)
	})
	t.Run("PAGO nao pode ser cancelado", func(t *testing.T) {
		m := novaMensalidadePendente()
		m.Status = MensalidadePago
		err := m.Cancelar()
		require.Error(t, err)
		assert.ErrorIs(t, err, shared.ErrMensalidadePagaNaoPodeSerCancelada)
	})
}

func TestMensalidade_MarcarVencida(t *testing.T) {
	t.Run("PENDENTE com data passada vira VENCIDO", func(t *testing.T) {
		m := novaMensalidadePendente()
		m.DataVencimento = time.Now().Add(-24 * time.Hour) // ontem
		mudou := m.MarcarVencida()
		assert.True(t, mudou)
		assert.Equal(t, MensalidadeVencido, m.Status)
	})
	t.Run("PENDENTE com data futura nao altera", func(t *testing.T) {
		m := novaMensalidadePendente()
		m.DataVencimento = time.Now().Add(24 * time.Hour) // amanhã
		mudou := m.MarcarVencida()
		assert.False(t, mudou)
		assert.Equal(t, MensalidadePendente, m.Status)
	})
	t.Run("PAGO nao altera mesmo com data passada", func(t *testing.T) {
		m := novaMensalidadePendente()
		m.Status = MensalidadePago
		m.DataVencimento = time.Now().Add(-24 * time.Hour)
		mudou := m.MarcarVencida()
		assert.False(t, mudou)
		assert.Equal(t, MensalidadePago, m.Status)
	})
	t.Run("idempotente: ja VENCIDO nao altera de novo", func(t *testing.T) {
		m := novaMensalidadePendente()
		m.Status = MensalidadeVencido
		m.DataVencimento = time.Now().Add(-24 * time.Hour)
		mudou := m.MarcarVencida()
		assert.False(t, mudou)
	})
}
