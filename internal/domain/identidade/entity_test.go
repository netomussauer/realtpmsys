package identidade

import (
	"strings"
	"testing"

	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestParsePerfil(t *testing.T) {
	tests := []struct {
		in      string
		want    Perfil
		wantErr bool
	}{
		{"ADMIN", PerfilAdmin, false},
		{"treinador", PerfilTreinador, false},
		{"  Responsavel ", PerfilResponsavel, false},
		{"", "", true},
		{"ROOT", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.in, func(t *testing.T) {
			got, err := ParsePerfil(tt.in)
			if tt.wantErr {
				assert.ErrorIs(t, err, shared.ErrPerfilInvalido)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestNormalizarEmail(t *testing.T) {
	tests := []struct {
		name    string
		in      string
		want    string
		wantErr bool
	}{
		{"minúsculas e trim", "  Fulano@Example.COM ", "fulano@example.com", false},
		{"vazio", "", "", true},
		{"sem arroba", "fulano.example.com", "", true},
		{"com nome de exibição", "Fulano <fulano@example.com>", "", true},
		{"longo demais", strings.Repeat("a", 250) + "@b.co", "", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := NormalizarEmail(tt.in)
			if tt.wantErr {
				assert.ErrorIs(t, err, shared.ErrEmailInvalido)
				return
			}
			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestValidarSenha(t *testing.T) {
	tests := []struct {
		name    string
		senha   string
		wantErr bool
	}{
		{"válida", "abcdefghi1", false},
		{"válida com acentos", "sênhaSegura9", false},
		{"curta", "abc123", true},
		{"nove caracteres", "abcdefgh1", true},
		{"sem dígito", "abcdefghijk", true},
		{"sem letra", "1234567890", true},
		{"72 bytes exatos", strings.Repeat("a", 71) + "1", false},
		{"73 bytes", strings.Repeat("a", 72) + "1", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidarSenha(tt.senha)
			if tt.wantErr {
				assert.ErrorIs(t, err, shared.ErrSenhaFraca)
				return
			}
			assert.NoError(t, err)
		})
	}
}

func TestGerarSenhaTemporaria(t *testing.T) {
	vistas := map[string]struct{}{}
	for i := 0; i < 50; i++ {
		s, err := GerarSenhaTemporaria()
		require.NoError(t, err)
		assert.Len(t, s, 16)
		assert.NoError(t, ValidarSenha(s), "senha gerada deve passar na própria política")
		assert.NotContains(t, s, "0")
		assert.NotContains(t, s, "O")
		vistas[s] = struct{}{}
	}
	assert.Len(t, vistas, 50, "senhas geradas não devem repetir")
}

func TestNovoUsuario(t *testing.T) {
	t.Run("sucesso normaliza e-mail e nome", func(t *testing.T) {
		u, err := NovoUsuario(" Ana@Example.com ", "  Ana Souza ", PerfilTreinador, "hash", true)
		require.NoError(t, err)
		assert.Equal(t, "ana@example.com", u.Email)
		assert.Equal(t, "Ana Souza", u.Nome)
		assert.Equal(t, PerfilTreinador, u.Perfil)
		assert.True(t, u.Ativo)
		assert.True(t, u.DeveTrocarSenha)
		assert.NotEqual(t, "", u.ID.String())
	})
	t.Run("e-mail inválido", func(t *testing.T) {
		_, err := NovoUsuario("nao-e-email", "", PerfilAdmin, "hash", false)
		assert.ErrorIs(t, err, shared.ErrEmailInvalido)
	})
	t.Run("perfil inválido", func(t *testing.T) {
		_, err := NovoUsuario("a@b.co", "", Perfil("ROOT"), "hash", false)
		assert.ErrorIs(t, err, shared.ErrPerfilInvalido)
	})
	t.Run("hash obrigatório", func(t *testing.T) {
		_, err := NovoUsuario("a@b.co", "", PerfilAdmin, "", false)
		assert.ErrorIs(t, err, shared.ErrDomainViolation)
	})
}

func TestUsuario_Transicoes(t *testing.T) {
	u, err := NovoUsuario("a@b.co", "A", PerfilResponsavel, "h1", false)
	require.NoError(t, err)

	u.Desativar()
	assert.False(t, u.Ativo)
	u.Desativar() // idempotente
	assert.False(t, u.Ativo)
	u.Ativar()
	assert.True(t, u.Ativo)

	require.NoError(t, u.AlterarPerfil(PerfilAdmin))
	assert.Equal(t, PerfilAdmin, u.Perfil)
	assert.ErrorIs(t, u.AlterarPerfil(Perfil("X")), shared.ErrPerfilInvalido)
	assert.Equal(t, PerfilAdmin, u.Perfil, "perfil inválido não altera o estado")

	u.AlterarNome("  Novo Nome ")
	assert.Equal(t, "Novo Nome", u.Nome)

	u.DefinirSenha("h2", true)
	assert.Equal(t, "h2", u.SenhaHash)
	assert.True(t, u.DeveTrocarSenha)
	u.DefinirSenha("h3", false)
	assert.False(t, u.DeveTrocarSenha)
}
