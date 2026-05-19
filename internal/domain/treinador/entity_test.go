package treinador

import (
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

func TestNew(t *testing.T) {
	usuarioID := uuid.New()

	t.Run("válido", func(t *testing.T) {
		tr, err := New(usuarioID, "Pedro Treinador")
		require.NoError(t, err)
		assert.Equal(t, usuarioID, tr.UsuarioID)
		assert.Equal(t, "Pedro Treinador", tr.Nome)
		assert.Equal(t, StatusAtivo, tr.Status)
		assert.NotEqual(t, uuid.Nil, tr.ID)
	})
	t.Run("usuario_id Nil rejeitado", func(t *testing.T) {
		_, err := New(uuid.Nil, "X")
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
	t.Run("nome vazio rejeitado", func(t *testing.T) {
		_, err := New(usuarioID, "")
		require.ErrorIs(t, err, shared.ErrNomeObrigatorio)
	})
}

func TestTreinador_SetCPF(t *testing.T) {
	novo := func(t *testing.T) *Treinador {
		t.Helper()
		tr, err := New(uuid.New(), "X")
		require.NoError(t, err)
		return tr
	}

	t.Run("11 dígitos válido", func(t *testing.T) {
		tr := novo(t)
		require.NoError(t, tr.SetCPF("12345678901"))
		require.NotNil(t, tr.CPF)
		assert.Equal(t, "12345678901", *tr.CPF)
	})
	t.Run("não-numérico rejeitado", func(t *testing.T) {
		tr := novo(t)
		err := tr.SetCPF("1234567890a")
		require.ErrorIs(t, err, shared.ErrCPFInvalido)
		assert.Nil(t, tr.CPF)
	})
	t.Run("tamanho errado rejeitado", func(t *testing.T) {
		tr := novo(t)
		err := tr.SetCPF("123")
		require.ErrorIs(t, err, shared.ErrCPFInvalido)
	})
}

func TestTreinador_IsDeleted(t *testing.T) {
	tr, _ := New(uuid.New(), "X")
	assert.False(t, tr.IsDeleted())

	now := tr.CriadoEm
	tr.DeletadoEm = &now
	assert.True(t, tr.IsDeleted())
}

func TestTreinador_TransicoesStatus(t *testing.T) {
	novo := func() *Treinador {
		tr, _ := New(uuid.New(), "X")
		return tr
	}

	t.Run("ATIVO -> INATIVO -> ATIVO", func(t *testing.T) {
		tr := novo()
		require.NoError(t, tr.Inativar())
		assert.Equal(t, StatusInativo, tr.Status)
		require.NoError(t, tr.Ativar())
		assert.Equal(t, StatusAtivo, tr.Status)
	})
	t.Run("Inativar duas vezes rejeita", func(t *testing.T) {
		tr := novo()
		require.NoError(t, tr.Inativar())
		err := tr.Inativar()
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
	t.Run("Ativar ATIVO rejeita", func(t *testing.T) {
		tr := novo()
		err := tr.Ativar()
		require.ErrorIs(t, err, shared.ErrDomainViolation)
	})
}
