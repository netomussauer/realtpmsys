// Package campo contém a entidade Campo de treino (local físico).
package campo

import (
	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// Campo é um local físico onde turmas treinam.
// Sem histórico/soft delete — usar `Ativo = false` para desativar.
type Campo struct {
	ID             uuid.UUID
	Nome           string
	Endereco       *string
	CapacidadeMax  *int
	Ativo          bool
}

// New cria um Campo validado.
func New(nome string, capacidadeMax *int) (*Campo, error) {
	if nome == "" {
		return nil, shared.Newf(shared.ErrDomainViolation, "nome do campo é obrigatório")
	}
	if capacidadeMax != nil && *capacidadeMax <= 0 {
		return nil, shared.Newf(shared.ErrDomainViolation, "capacidade_max deve ser positiva")
	}
	return &Campo{
		ID:            uuid.New(),
		Nome:          nome,
		CapacidadeMax: capacidadeMax,
		Ativo:         true,
	}, nil
}

// Ativar e Inativar alternam o estado do campo.
func (c *Campo) Ativar()   { c.Ativo = true }
func (c *Campo) Inativar() { c.Ativo = false }
