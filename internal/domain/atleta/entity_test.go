package atleta

import (
	"testing"
	"time"

	"github.com/google/uuid"
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

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSAVEL
// ─────────────────────────────────────────────────────────────────────────────

func TestIsValidParentesco(t *testing.T) {
	assert.True(t, IsValidParentesco(ParentescoPai))
	assert.True(t, IsValidParentesco(ParentescoMae))
	assert.True(t, IsValidParentesco(ParentescoAvo))
	assert.True(t, IsValidParentesco(ParentescoOutro))
	assert.False(t, IsValidParentesco(Parentesco("TIO")))
	assert.False(t, IsValidParentesco(Parentesco("")))
}

func TestNewResponsavel(t *testing.T) {
	atletaID := uuid.New()
	tests := []struct {
		name       string
		atletaID   uuid.UUID
		nome       string
		telefone   string
		parentesco Parentesco
		wantErr    error
	}{
		{"válido PAI", atletaID, "João Silva", "11999998888", ParentescoPai, nil},
		{"válido MAE", atletaID, "Maria Silva", "11999997777", ParentescoMae, nil},
		{"atleta_id Nil rejeitado", uuid.Nil, "X", "11999", ParentescoPai, shared.ErrDomainViolation},
		{"nome vazio rejeitado", atletaID, "", "11999", ParentescoPai, shared.ErrNomeObrigatorio},
		{"telefone vazio rejeitado", atletaID, "X", "", ParentescoPai, shared.ErrDomainViolation},
		{"parentesco vazio rejeitado", atletaID, "X", "11999", "", shared.ErrDomainViolation},
		{"parentesco inválido rejeitado", atletaID, "X", "11999", Parentesco("TIO"), shared.ErrDomainViolation},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r, err := NewResponsavel(tc.atletaID, tc.nome, tc.telefone, tc.parentesco)
			if tc.wantErr != nil {
				require.Error(t, err)
				assert.ErrorIs(t, err, tc.wantErr)
				return
			}
			require.NoError(t, err)
			require.NotNil(t, r)
			assert.NotEqual(t, uuid.Nil, r.ID)
			assert.False(t, r.ContatoPrincipal, "responsável nasce não-principal")
			assert.Nil(t, r.CPF)
			assert.Nil(t, r.Email)
		})
	}
}

func TestResponsavel_SetCPF(t *testing.T) {
	novo := func(t *testing.T) *Responsavel {
		t.Helper()
		r, err := NewResponsavel(uuid.New(), "X", "11999", ParentescoPai)
		require.NoError(t, err)
		return r
	}
	t.Run("11 dígitos válido", func(t *testing.T) {
		r := novo(t)
		require.NoError(t, r.SetCPF("12345678901"))
		require.NotNil(t, r.CPF)
		assert.Equal(t, "12345678901", *r.CPF)
	})
	t.Run("10 dígitos rejeita", func(t *testing.T) {
		r := novo(t)
		err := r.SetCPF("1234567890")
		require.ErrorIs(t, err, shared.ErrCPFInvalido)
		assert.Nil(t, r.CPF)
	})
	t.Run("com letra rejeita", func(t *testing.T) {
		r := novo(t)
		err := r.SetCPF("1234567890a")
		require.ErrorIs(t, err, shared.ErrCPFInvalido)
	})
}

func TestResponsavel_TogglePrincipal(t *testing.T) {
	r, _ := NewResponsavel(uuid.New(), "X", "11999", ParentescoPai)
	assert.False(t, r.ContatoPrincipal)

	before := r.AtualizadoEm
	time.Sleep(time.Microsecond)
	r.MarcarComoPrincipal()
	assert.True(t, r.ContatoPrincipal)
	assert.True(t, r.AtualizadoEm.After(before), "AtualizadoEm deve ser bumpada")

	r.Despromover()
	assert.False(t, r.ContatoPrincipal)
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIFORME
// ─────────────────────────────────────────────────────────────────────────────

func TestNewUniforme(t *testing.T) {
	atletaID := uuid.New()
	tests := []struct {
		name                            string
		atletaID                        uuid.UUID
		camisa, short, chuteira         string
		wantErr                         error
	}{
		{"válido", atletaID, "M", "12", "34", nil},
		{"atleta_id Nil rejeitado", uuid.Nil, "M", "12", "34", shared.ErrDomainViolation},
		{"camisa vazia rejeitada", atletaID, "", "12", "34", shared.ErrDomainViolation},
		{"short vazio rejeitado", atletaID, "M", "", "34", shared.ErrDomainViolation},
		{"chuteira vazia rejeitada", atletaID, "M", "12", "", shared.ErrDomainViolation},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			u, err := NewUniforme(tc.atletaID, tc.camisa, tc.short, tc.chuteira)
			if tc.wantErr != nil {
				require.Error(t, err)
				assert.ErrorIs(t, err, tc.wantErr)
				return
			}
			require.NoError(t, err)
			require.NotNil(t, u)
			assert.NotEqual(t, uuid.Nil, u.ID)
			assert.Equal(t, atletaID, u.AtletaID)
			assert.Equal(t, "M", u.TamCamisa)
			assert.False(t, u.AtualizadoEm.IsZero())
		})
	}
}

func TestUniforme_AtualizarTamanhos(t *testing.T) {
	u, _ := NewUniforme(uuid.New(), "M", "12", "34")
	before := u.AtualizadoEm
	idOriginal := u.ID
	time.Sleep(time.Microsecond)

	t.Run("válido bumpa AtualizadoEm e preserva ID", func(t *testing.T) {
		require.NoError(t, u.AtualizarTamanhos("L", "14", "36"))
		assert.Equal(t, "L", u.TamCamisa)
		assert.Equal(t, "14", u.TamShort)
		assert.Equal(t, "36", u.TamChuteira)
		assert.Equal(t, idOriginal, u.ID, "ID não muda em atualização")
		assert.True(t, u.AtualizadoEm.After(before))
	})

	t.Run("string vazia rejeita e preserva estado", func(t *testing.T) {
		err := u.AtualizarTamanhos("XL", "", "38")
		require.ErrorIs(t, err, shared.ErrDomainViolation)
		assert.Equal(t, "L", u.TamCamisa, "estado não pode ter sido alterado")
	})
}
