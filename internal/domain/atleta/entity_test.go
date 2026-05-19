package atleta

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

func TestNew(t *testing.T) {
	t.Run("válido", func(t *testing.T) {
		a, err := New("João Silva", time.Date(2014, 3, 22, 0, 0, 0, 0, time.UTC))
		require.NoError(t, err)
		require.NotNil(t, a)
		assert.Equal(t, "João Silva", a.Nome)
		assert.Equal(t, StatusAtivo, a.Status)
		assert.False(t, a.CriadoEm.IsZero())
	})
	t.Run("nome vazio rejeitado", func(t *testing.T) {
		_, err := New("", time.Date(2014, 3, 22, 0, 0, 0, 0, time.UTC))
		require.ErrorIs(t, err, shared.ErrNomeObrigatorio)
	})
	t.Run("data_nascimento zero rejeitado", func(t *testing.T) {
		_, err := New("X", time.Time{})
		require.Error(t, err)
		assert.ErrorIs(t, err, shared.ErrDomainViolation)
	})
}

func TestAtleta_SetCPF(t *testing.T) {
	novo := func(t *testing.T) *Atleta {
		t.Helper()
		a, err := New("X", time.Now())
		require.NoError(t, err)
		return a
	}

	tests := []struct {
		name    string
		cpf     string
		wantErr bool
	}{
		{"11 dígitos válido", "12345678901", false},
		{"10 dígitos rejeitado", "1234567890", true},
		{"12 dígitos rejeitado", "123456789012", true},
		{"com letras rejeitado", "12345678a01", true},
		{"com pontuação rejeitado", "123.456.789-01", true}, // 14 chars
		{"vazio rejeitado", "", true},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			a := novo(t)
			err := a.SetCPF(tc.cpf)
			if tc.wantErr {
				assert.ErrorIs(t, err, shared.ErrCPFInvalido)
				assert.Nil(t, a.CPF)
				return
			}
			require.NoError(t, err)
			require.NotNil(t, a.CPF)
			assert.Equal(t, tc.cpf, *a.CPF)
		})
	}
}

func TestAtleta_Idade(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name           string
		dataNascimento time.Time
		want           int
	}{
		{
			"5 anos atrás exatos",
			time.Date(now.Year()-5, now.Month(), now.Day(), 0, 0, 0, 0, time.UTC),
			5,
		},
		{
			"5 anos atrás, aniversário amanhã (ainda 4)",
			time.Date(now.Year()-5, now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).Add(24 * time.Hour),
			4,
		},
		{
			"5 anos atrás, aniversário ontem (já fez 5)",
			time.Date(now.Year()-5, now.Month(), now.Day(), 0, 0, 0, 0, time.UTC).Add(-24 * time.Hour),
			5,
		},
		{
			"nascido hoje",
			time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC),
			0,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			a := &Atleta{DataNascimento: tc.dataNascimento}
			assert.Equal(t, tc.want, a.Idade())
		})
	}
}

func TestAtleta_TransicoesStatus(t *testing.T) {
	novo := func() *Atleta {
		a, _ := New("X", time.Now())
		return a
	}

	t.Run("ATIVO -> INATIVO -> rejeita Inativar de novo", func(t *testing.T) {
		a := novo()
		require.NoError(t, a.Inativar())
		assert.Equal(t, StatusInativo, a.Status)

		err := a.Inativar()
		require.ErrorIs(t, err, shared.ErrAtletaJaInativo)
	})

	t.Run("ATIVO -> SUSPENSO -> rejeita Suspender de novo", func(t *testing.T) {
		a := novo()
		require.NoError(t, a.Suspender())
		assert.Equal(t, StatusSuspenso, a.Status)

		err := a.Suspender()
		require.ErrorIs(t, err, shared.ErrAtletaJaSuspenso)
	})

	t.Run("INATIVO -> Reativar volta ATIVO", func(t *testing.T) {
		a := novo()
		require.NoError(t, a.Inativar())
		a.Reativar()
		assert.Equal(t, StatusAtivo, a.Status)
	})

	t.Run("SUSPENSO -> Reativar volta ATIVO", func(t *testing.T) {
		a := novo()
		require.NoError(t, a.Suspender())
		a.Reativar()
		assert.Equal(t, StatusAtivo, a.Status)
	})

	t.Run("Reativar é idempotente sobre ATIVO", func(t *testing.T) {
		a := novo()
		a.Reativar()
		assert.Equal(t, StatusAtivo, a.Status)
	})
}

func TestAtleta_IsDeleted(t *testing.T) {
	a := &Atleta{}
	assert.False(t, a.IsDeleted())

	now := time.Now()
	a.DeletadoEm = &now
	assert.True(t, a.IsDeleted())
}
