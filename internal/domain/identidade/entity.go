// Package identidade contém as entidades do contexto Identidade.
package identidade

import (
	"crypto/rand"
	"math/big"
	"net/mail"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// Perfil representa o papel do usuário no sistema.
type Perfil string

const (
	PerfilAdmin       Perfil = "ADMIN"
	PerfilTreinador   Perfil = "TREINADOR"
	PerfilResponsavel Perfil = "RESPONSAVEL"
)

// ParsePerfil valida e converte uma string para Perfil.
func ParsePerfil(s string) (Perfil, error) {
	switch p := Perfil(strings.ToUpper(strings.TrimSpace(s))); p {
	case PerfilAdmin, PerfilTreinador, PerfilResponsavel:
		return p, nil
	}
	return "", shared.ErrPerfilInvalido
}

// Limites de senha. O máximo de 72 bytes é o limite do bcrypt: acima disso o
// hash ignora silenciosamente o restante da senha.
const (
	SenhaMinRunes = 10
	SenhaMaxBytes = 72
)

// Usuario é o Aggregate Root do contexto Identidade.
type Usuario struct {
	ID              uuid.UUID
	Email           string
	Nome            string
	SenhaHash       string
	Perfil          Perfil
	Ativo           bool
	DeveTrocarSenha bool
	CriadoEm        time.Time
	AtualizadoEm    time.Time
	DeletadoEm      *time.Time
}

// NovoUsuario cria um Usuario ativo e validado. `senhaHash` já deve ser o
// hash bcrypt — o domínio nunca vê a senha em texto puro, exceto em
// ValidarSenha, chamada pelo use case antes de gerar o hash.
func NovoUsuario(email, nome string, perfil Perfil, senhaHash string, deveTrocarSenha bool) (*Usuario, error) {
	email, err := NormalizarEmail(email)
	if err != nil {
		return nil, err
	}
	if _, err := ParsePerfil(string(perfil)); err != nil {
		return nil, err
	}
	if senhaHash == "" {
		return nil, shared.Newf(shared.ErrDomainViolation, "hash de senha é obrigatório")
	}
	now := time.Now().UTC()
	return &Usuario{
		ID:              uuid.New(),
		Email:           email,
		Nome:            strings.TrimSpace(nome),
		SenhaHash:       senhaHash,
		Perfil:          perfil,
		Ativo:           true,
		DeveTrocarSenha: deveTrocarSenha,
		CriadoEm:        now,
		AtualizadoEm:    now,
	}, nil
}

// NormalizarEmail valida o formato e devolve o e-mail em minúsculas.
func NormalizarEmail(email string) (string, error) {
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || len(email) > 254 {
		return "", shared.ErrEmailInvalido
	}
	addr, err := mail.ParseAddress(email)
	// Rejeita formas como "Fulano <a@b.c>": só aceitamos o endereço puro.
	if err != nil || addr.Address != email {
		return "", shared.ErrEmailInvalido
	}
	return email, nil
}

// ValidarSenha aplica a política de senha: mínimo de 10 caracteres, ao menos
// uma letra e um dígito, e no máximo 72 bytes (limite do bcrypt).
func ValidarSenha(senha string) error {
	if len(senha) > SenhaMaxBytes {
		return shared.Newf(shared.ErrSenhaFraca, "máximo de 72 bytes")
	}
	if utf8.RuneCountInString(senha) < SenhaMinRunes {
		return shared.Newf(shared.ErrSenhaFraca, "mínimo de 10 caracteres")
	}
	var letra, digito bool
	for _, r := range senha {
		switch {
		case unicode.IsLetter(r):
			letra = true
		case unicode.IsDigit(r):
			digito = true
		}
	}
	if !letra || !digito {
		return shared.Newf(shared.ErrSenhaFraca, "deve conter ao menos uma letra e um dígito")
	}
	return nil
}

// alfabeto da senha temporária: sem caracteres ambíguos (0/O, 1/l/I).
const alfabetoSenhaTemp = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// GerarSenhaTemporaria devolve uma senha aleatória de 16 caracteres (crypto/rand)
// que satisfaz ValidarSenha.
func GerarSenhaTemporaria() (string, error) {
	const tamanho = 16
	for {
		buf := make([]byte, tamanho)
		for i := range buf {
			n, err := rand.Int(rand.Reader, big.NewInt(int64(len(alfabetoSenhaTemp))))
			if err != nil {
				return "", err
			}
			buf[i] = alfabetoSenhaTemp[n.Int64()]
		}
		if s := string(buf); ValidarSenha(s) == nil {
			return s, nil
		}
	}
}

// Desativar bloqueia login e refresh. Idempotente.
func (u *Usuario) Desativar() {
	u.Ativo = false
	u.AtualizadoEm = time.Now().UTC()
}

// Ativar reabilita a conta. Idempotente.
func (u *Usuario) Ativar() {
	u.Ativo = true
	u.AtualizadoEm = time.Now().UTC()
}

// AlterarPerfil troca o perfil do usuário.
func (u *Usuario) AlterarPerfil(p Perfil) error {
	if _, err := ParsePerfil(string(p)); err != nil {
		return err
	}
	u.Perfil = p
	u.AtualizadoEm = time.Now().UTC()
	return nil
}

// AlterarNome atualiza o nome de exibição (pode ficar vazio).
func (u *Usuario) AlterarNome(nome string) {
	u.Nome = strings.TrimSpace(nome)
	u.AtualizadoEm = time.Now().UTC()
}

// DefinirSenha troca o hash de senha. `deveTrocar` indica senha temporária
// (redefinição pelo ADMIN) — o usuário será forçado a trocá-la no próximo login.
func (u *Usuario) DefinirSenha(novoHash string, deveTrocar bool) {
	u.SenhaHash = novoHash
	u.DeveTrocarSenha = deveTrocar
	u.AtualizadoEm = time.Now().UTC()
}
