package frequencia

import (
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// ─────────────────────────────────────────────────────────────────────────────
// TREINO
// ─────────────────────────────────────────────────────────────────────────────

func TestNewTreino(t *testing.T) {
	turmaID := uuid.New()

	t.Run("válido", func(t *testing.T) {
		dataTreino := time.Date(2026, 5, 19, 0, 0, 0, 0, time.UTC)
		tr, err := NewTreino(turmaID, dataTreino)
		require.NoError(t, err)
		assert.Equal(t, turmaID, tr.TurmaID)
		assert.Equal(t, dataTreino, tr.DataTreino)
		assert.NotEqual(t, uuid.Nil, tr.ID)
	})
	t.Run("data zero rejeitada", func(t *testing.T) {
		_, err := NewTreino(turmaID, time.Time{})
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
}

func TestTreino_SetHorario(t *testing.T) {
	novo := func(t *testing.T) *Treino {
		t.Helper()
		tr, err := NewTreino(uuid.New(), time.Now())
		require.NoError(t, err)
		return tr
	}

	tests := []struct {
		name        string
		ini, fim    string
		wantErr     bool
		wantIni     string
		wantFim     string
	}{
		{"ambos vazios mantém nulo", "", "", false, "", ""},
		{"horário válido HH:MM", "08:00", "10:00", false, "08:00", "10:00"},
		{"hora_fim == hora_inicio rejeitado", "08:00", "08:00", true, "", ""},
		{"hora_fim < hora_inicio rejeitado", "10:00", "08:00", true, "", ""},
		{"só hora_inicio rejeitado", "08:00", "", true, "", ""},
		{"só hora_fim rejeitado", "", "10:00", true, "", ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			tr := novo(t)
			err := tr.SetHorario(tc.ini, tc.fim)
			if tc.wantErr {
				require.Error(t, err)
				assert.ErrorIs(t, err, shared.ErrDomainViolation)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tc.wantIni, tr.HoraInicio)
			assert.Equal(t, tc.wantFim, tr.HoraFim)
		})
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// FREQUENCIA
// ─────────────────────────────────────────────────────────────────────────────

func TestPresenca_IsValid(t *testing.T) {
	assert.True(t, PresencaPresente.IsValid())
	assert.True(t, PresencaAusente.IsValid())
	assert.True(t, PresencaJustificado.IsValid())
	assert.False(t, Presenca("FALTOSO").IsValid())
	assert.False(t, Presenca("").IsValid())
}

func TestNewFrequencia(t *testing.T) {
	treinoID, atletaID := uuid.New(), uuid.New()
	just := "atestado médico"
	justVazia := ""

	tests := []struct {
		name          string
		presenca      Presenca
		justificativa *string
		wantErr       bool
	}{
		{"PRESENTE sem justificativa", PresencaPresente, nil, false},
		{"AUSENTE sem justificativa", PresencaAusente, nil, false},
		{"JUSTIFICADO com justificativa", PresencaJustificado, &just, false},
		{"JUSTIFICADO sem justificativa rejeita", PresencaJustificado, nil, true},
		{"JUSTIFICADO com string vazia rejeita", PresencaJustificado, &justVazia, true},
		{"presença inválida rejeita", Presenca("FALTOSO"), nil, true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			f, err := NewFrequencia(treinoID, atletaID, tc.presenca, tc.justificativa)
			if tc.wantErr {
				require.Error(t, err)
				assert.ErrorIs(t, err, shared.ErrDomainViolation)
				return
			}
			require.NoError(t, err)
			require.NotNil(t, f)
			assert.Equal(t, treinoID, f.TreinoID)
			assert.Equal(t, atletaID, f.AtletaID)
			assert.Equal(t, tc.presenca, f.Presenca)
			assert.False(t, f.RegistradoEm.IsZero())
		})
	}
}
