// Package atleta contém as entidades do contexto Atletas.
// Sem dependências externas — apenas stdlib do Go.
package atleta

import (
	"time"
	"unicode"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// Status representa o estado do atleta no sistema.
type Status string

const (
	StatusAtivo    Status = "ATIVO"
	StatusInativo  Status = "INATIVO"
	StatusSuspenso Status = "SUSPENSO"
)

// Parentesco define o vínculo do responsável com o atleta.
type Parentesco string

const (
	ParentescoPai   Parentesco = "PAI"
	ParentescoMae   Parentesco = "MAE"
	ParentescoAvo   Parentesco = "AVO"
	ParentescoOutro Parentesco = "OUTRO"
)

// Atleta é o Aggregate Root do contexto Atletas.
type Atleta struct {
	ID                   uuid.UUID
	Nome                 string
	DataNascimento       time.Time
	CPF                  *string
	RG                   *string
	Endereco             *string
	Cidade               *string
	UF                   *string
	CEP                  *string
	Email                *string
	Telefone             *string
	Status               Status
	UsuarioResponsavelID *uuid.UUID
	CriadoEm            time.Time
	AtualizadoEm        time.Time
	DeletadoEm          *time.Time
}

// New cria um Atleta validado. Retorna erro se as regras de domínio forem violadas.
func New(nome string, dataNascimento time.Time) (*Atleta, error) {
	if nome == "" {
		return nil, shared.ErrNomeObrigatorio
	}
	if dataNascimento.IsZero() {
		return nil, shared.Newf(shared.ErrDomainViolation, "data de nascimento é obrigatória")
	}
	now := time.Now().UTC()
	return &Atleta{
		ID:             uuid.New(),
		Nome:           nome,
		DataNascimento: dataNascimento,
		Status:         StatusAtivo,
		CriadoEm:      now,
		AtualizadoEm:  now,
	}, nil
}

// Inativar marca o atleta como inativo.
func (a *Atleta) Inativar() error {
	if a.Status == StatusInativo {
		return shared.ErrAtletaJaInativo
	}
	a.Status = StatusInativo
	a.AtualizadoEm = time.Now().UTC()
	return nil
}

// Suspender marca o atleta como suspenso.
func (a *Atleta) Suspender() error {
	if a.Status == StatusSuspenso {
		return shared.ErrAtletaJaSuspenso
	}
	a.Status = StatusSuspenso
	a.AtualizadoEm = time.Now().UTC()
	return nil
}

// Reativar retorna o atleta ao status ativo.
func (a *Atleta) Reativar() {
	a.Status = StatusAtivo
	a.AtualizadoEm = time.Now().UTC()
}

// SetCPF valida e define o CPF do atleta.
func (a *Atleta) SetCPF(cpf string) error {
	if len(cpf) != 11 {
		return shared.ErrCPFInvalido
	}
	for _, r := range cpf {
		if !unicode.IsDigit(r) {
			return shared.ErrCPFInvalido
		}
	}
	a.CPF = &cpf
	return nil
}

// Idade retorna a idade calculada a partir da data de nascimento.
func (a *Atleta) Idade() int {
	today := time.Now()
	age := today.Year() - a.DataNascimento.Year()
	if today.Month() < a.DataNascimento.Month() ||
		(today.Month() == a.DataNascimento.Month() && today.Day() < a.DataNascimento.Day()) {
		age--
	}
	return age
}

// IsDeleted indica se o atleta foi excluído logicamente.
func (a *Atleta) IsDeleted() bool {
	return a.DeletadoEm != nil
}

// ─────────────────────────────────────────────────────────────────────────────

// Responsavel representa o responsável de um atleta menor de idade.
type Responsavel struct {
	ID               uuid.UUID
	AtletaID         uuid.UUID
	Nome             string
	CPF              *string
	Email            *string
	Telefone         string
	Parentesco       Parentesco
	ContatoPrincipal bool
	CriadoEm        time.Time
	AtualizadoEm    time.Time
}

// Uniforme armazena os tamanhos de uniforme do atleta.
type Uniforme struct {
	ID          uuid.UUID
	AtletaID    uuid.UUID
	TamCamisa   string
	TamShort    string
	TamChuteira string
	AtualizadoEm time.Time
}
