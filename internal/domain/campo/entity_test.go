package campo

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

func TestNew(t *testing.T) {
	cap20 := 20
	capInvalida := 0

	t.Run("válido sem capacidade", func(t *testing.T) {
		c, err := New("Campo Principal", nil)
		require.NoError(t, err)
		assert.Equal(t, "Campo Principal", c.Nome)
		assert.True(t, c.Ativo, "Campo novo deve nascer ATIVO")
		assert.NotEqual(t, uuid.Nil, c.ID)
		assert.Nil(t, c.CapacidadeMax)
	})
	t.Run("válido com capacidade", func(t *testing.T) {
		c, err := New("Campo 2", &cap20)
		require.NoError(t, err)
		require.NotNil(t, c.CapacidadeMax)
		assert.Equal(t, 20, *c.CapacidadeMax)
	})
	t.Run("nome vazio rejeitado", func(t *testing.T) {
		_, err := New("", nil)
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
	t.Run("capacidade zero rejeitada", func(t *testing.T) {
		_, err := New("X", &capInvalida)
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
}

func TestCampo_Toggle(t *testing.T) {
	c, err := New("X", nil)
	require.NoError(t, err)
	require.True(t, c.Ativo)

	c.Inativar()
	assert.False(t, c.Ativo)

	c.Ativar()
	assert.True(t, c.Ativo)

	// Idempotente: chamar Ativar de novo não dá erro nem altera nada
	c.Ativar()
	assert.True(t, c.Ativo)
}
