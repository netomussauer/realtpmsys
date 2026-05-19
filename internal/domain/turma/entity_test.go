package turma

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// ─────────────────────────────────────────────────────────────────────────────
// TURMA
// ─────────────────────────────────────────────────────────────────────────────

func TestNewTurma(t *testing.T) {
	tests := []struct {
		name                       string
		nomeTurma                  string
		faixaMin, faixaMax, capMax int
		wantErr                    error
	}{
		{"válido limite inferior (4-4)", "Sub-4", 4, 4, 10, nil},
		{"válido limite superior (18-18)", "Sub-18", 18, 18, 10, nil},
		{"válido faixa ampla", "Geral", 6, 12, 20, nil},
		{"nome vazio rejeitado", "", 6, 12, 10, shared.ErrDomainViolation},
		{"faixa_min < 4 rejeitado", "X", 3, 10, 10, shared.ErrFaixaEtariaInvalida},
		{"faixa_max > 18 rejeitado", "X", 6, 19, 10, shared.ErrFaixaEtariaInvalida},
		{"min > max rejeitado", "X", 12, 8, 10, shared.ErrFaixaEtariaInvalida},
		{"capacidade zero rejeitada", "X", 6, 12, 0, shared.ErrDomainViolation},
		{"capacidade negativa rejeitada", "X", 6, 12, -5, shared.ErrDomainViolation},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			tur, err := NewTurma(tc.nomeTurma, tc.faixaMin, tc.faixaMax, tc.capMax)
			if tc.wantErr != nil {
				require.Error(t, err)
				assert.ErrorIs(t, err, tc.wantErr)
				return
			}
			require.NoError(t, err)
			require.NotNil(t, tur)
			assert.Equal(t, StatusAtiva, tur.Status)
			assert.NotEqual(t, uuid.Nil, tur.ID)
		})
	}
}

func TestTurma_TransicoesStatus(t *testing.T) {
	novo := func() *Turma {
		tur, _ := NewTurma("X", 6, 12, 20)
		return tur
	}

	t.Run("ATIVA -> SUSPENSA -> Reativar volta ATIVA", func(t *testing.T) {
		tur := novo()
		require.NoError(t, tur.Suspender())
		assert.Equal(t, StatusSuspensa, tur.Status)
		require.NoError(t, tur.Reativar())
		assert.Equal(t, StatusAtiva, tur.Status)
	})
	t.Run("Suspender ENCERRADA rejeita", func(t *testing.T) {
		tur := novo()
		require.NoError(t, tur.Encerrar())
		err := tur.Suspender()
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
	t.Run("Reativar ATIVA rejeita (so SUSPENSA)", func(t *testing.T) {
		tur := novo()
		err := tur.Reativar()
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
	t.Run("Encerrar ENCERRADA rejeita (idempotente)", func(t *testing.T) {
		tur := novo()
		require.NoError(t, tur.Encerrar())
		err := tur.Encerrar()
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
}

func TestTurma_AceitaIdade(t *testing.T) {
	tur, _ := NewTurma("Sub-12", 8, 12, 20)
	tests := []struct {
		idade int
		want  bool
	}{
		{7, false}, {8, true}, {10, true}, {12, true}, {13, false},
	}
	for _, tc := range tests {
		assert.Equalf(t, tc.want, tur.AceitaIdade(tc.idade),
			"idade=%d esperava %v", tc.idade, tc.want)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// MATRICULA
// ─────────────────────────────────────────────────────────────────────────────

func TestNewMatricula(t *testing.T) {
	atletaID, turmaID := uuid.New(), uuid.New()

	t.Run("válida", func(t *testing.T) {
		dataInicio := time.Date(2026, 5, 1, 0, 0, 0, 0, time.UTC)
		m, err := NewMatricula(atletaID, turmaID, dataInicio)
		require.NoError(t, err)
		assert.Equal(t, MatriculaAtiva, m.Status)
		assert.Equal(t, atletaID, m.AtletaID)
		assert.Equal(t, turmaID, m.TurmaID)
		assert.Equal(t, dataInicio, m.DataInicio)
		assert.Nil(t, m.DataFim)
	})
	t.Run("data_inicio zero rejeitada", func(t *testing.T) {
		_, err := NewMatricula(atletaID, turmaID, time.Time{})
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
}

func TestMatricula_Cancelar(t *testing.T) {
	novo := func() *Matricula {
		m, _ := NewMatricula(uuid.New(), uuid.New(), time.Now())
		return m
	}

	t.Run("ATIVA -> CANCELADA seta data_fim", func(t *testing.T) {
		m := novo()
		require.NoError(t, m.Cancelar())
		assert.Equal(t, MatriculaCancelada, m.Status)
		require.NotNil(t, m.DataFim)
		assert.WithinDuration(t, time.Now(), *m.DataFim, 2*time.Second)
	})
	t.Run("CANCELADA -> cancelar de novo rejeita", func(t *testing.T) {
		m := novo()
		require.NoError(t, m.Cancelar())
		err := m.Cancelar()
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
	t.Run("TRANSFERIDA -> Cancelar rejeita", func(t *testing.T) {
		m := novo()
		m.Status = MatriculaTransferida
		err := m.Cancelar()
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
}
