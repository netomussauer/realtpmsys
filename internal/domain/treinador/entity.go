// Package treinador contém as entidades do contexto Treinadores.
package treinador

import (
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// Status representa o estado do treinador.
type Status string

const (
	StatusAtivo   Status = "ATIVO"
	StatusInativo Status = "INATIVO"
)

// Treinador é o Aggregate Root do contexto.
// Cada Treinador é vinculado 1:1 a um Usuario (autenticação).
type Treinador struct {
	ID           uuid.UUID
	UsuarioID    uuid.UUID
	Nome         string
	CPF          *string
	CREF         *string
	Telefone     *string
	Status       Status
	CriadoEm     time.Time
	AtualizadoEm time.Time
	DeletadoEm   *time.Time
}

// New cria um Treinador validado.
func New(usuarioID uuid.UUID, nome string) (*Treinador, error) {
	if usuarioID == uuid.Nil {
		return nil, shared.Newf(shared.ErrDomainViolation, "usuario_id é obrigatório")
	}
	if nome == "" {
		return nil, shared.ErrNomeObrigatorio
	}
	now := time.Now().UTC()
	return &Treinador{
		ID:           uuid.New(),
		UsuarioID:    usuarioID,
		Nome:         nome,
		Status:       StatusAtivo,
		CriadoEm:     now,
		AtualizadoEm: now,
	}, nil
}

// SetCPF valida 11 dígitos numéricos.
func (t *Treinador) SetCPF(cpf string) error {
	if len(cpf) != 11 {
		return shared.ErrCPFInvalido
	}
	for _, r := range cpf {
		if !unicode.IsDigit(r) {
			return shared.ErrCPFInvalido
		}
	}
	t.CPF = &cpf
	return nil
}

// Inativar marca o treinador como inativo.
func (t *Treinador) Inativar() error {
	if t.Status == StatusInativo {
		return shared.Newf(shared.ErrDomainViolation, "treinador já está inativo")
	}
	t.Status = StatusInativo
	t.AtualizadoEm = time.Now().UTC()
	return nil
}

// Ativar marca o treinador como ativo.
func (t *Treinador) Ativar() error {
	if t.Status == StatusAtivo {
		return shared.Newf(shared.ErrDomainViolation, "treinador já está ativo")
	}
	t.Status = StatusAtivo
	t.AtualizadoEm = time.Now().UTC()
	return nil
}

// IsDeleted indica exclusão lógica.
func (t *Treinador) IsDeleted() bool {
	return t.DeletadoEm != nil
}
