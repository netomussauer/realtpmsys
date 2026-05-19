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
	CriadoEm         time.Time
	AtualizadoEm     time.Time
}

// IsValidParentesco retorna true se p está entre os valores aceitos.
func IsValidParentesco(p Parentesco) bool {
	switch p {
	case ParentescoPai, ParentescoMae, ParentescoAvo, ParentescoOutro:
		return true
	}
	return false
}

// NewResponsavel cria um Responsavel validado.
// telefone é obrigatório (NOT NULL no schema); CPF e email opcionais.
func NewResponsavel(atletaID uuid.UUID, nome, telefone string, parentesco Parentesco) (*Responsavel, error) {
	if atletaID == uuid.Nil {
		return nil, shared.Newf(shared.ErrDomainViolation, "atleta_id é obrigatório")
	}
	if nome == "" {
		return nil, shared.ErrNomeObrigatorio
	}
	if telefone == "" {
		return nil, shared.Newf(shared.ErrDomainViolation, "telefone do responsável é obrigatório")
	}
	if !IsValidParentesco(parentesco) {
		return nil, shared.Newf(shared.ErrDomainViolation, "parentesco inválido: "+string(parentesco))
	}
	now := time.Now().UTC()
	return &Responsavel{
		ID:           uuid.New(),
		AtletaID:     atletaID,
		Nome:         nome,
		Telefone:     telefone,
		Parentesco:   parentesco,
		CriadoEm:     now,
		AtualizadoEm: now,
	}, nil
}

// SetCPF valida 11 dígitos numéricos.
func (r *Responsavel) SetCPF(cpf string) error {
	if len(cpf) != 11 {
		return shared.ErrCPFInvalido
	}
	for _, ru := range cpf {
		if !unicode.IsDigit(ru) {
			return shared.ErrCPFInvalido
		}
	}
	r.CPF = &cpf
	return nil
}

// MarcarComoPrincipal define este responsável como contato principal.
// A unicidade por atleta é garantida no DB via unique index parcial; o use
// case deve despromover o principal anterior numa transação antes de chamar.
func (r *Responsavel) MarcarComoPrincipal() {
	r.ContatoPrincipal = true
	r.AtualizadoEm = time.Now().UTC()
}

// Despromover remove o flag de contato principal.
func (r *Responsavel) Despromover() {
	r.ContatoPrincipal = false
	r.AtualizadoEm = time.Now().UTC()
}

// ─────────────────────────────────────────────────────────────────────────────

// Uniforme armazena os tamanhos de uniforme do atleta.
// Cada atleta tem no máximo um Uniforme (constraint unique no DB).
type Uniforme struct {
	ID           uuid.UUID
	AtletaID     uuid.UUID
	TamCamisa    string
	TamShort     string
	TamChuteira  string
	AtualizadoEm time.Time
}

// NewUniforme cria um Uniforme validado. Todos os tamanhos são obrigatórios
// (NOT NULL no schema) e devem ser strings não-vazias.
func NewUniforme(atletaID uuid.UUID, tamCamisa, tamShort, tamChuteira string) (*Uniforme, error) {
	if atletaID == uuid.Nil {
		return nil, shared.Newf(shared.ErrDomainViolation, "atleta_id é obrigatório")
	}
	if tamCamisa == "" || tamShort == "" || tamChuteira == "" {
		return nil, shared.Newf(shared.ErrDomainViolation,
			"tam_camisa, tam_short e tam_chuteira são obrigatórios")
	}
	return &Uniforme{
		ID:           uuid.New(),
		AtletaID:     atletaID,
		TamCamisa:    tamCamisa,
		TamShort:     tamShort,
		TamChuteira:  tamChuteira,
		AtualizadoEm: time.Now().UTC(),
	}, nil
}

// AtualizarTamanhos substitui os 3 tamanhos numa única operação,
// preservando ID/AtletaID. Bumpa AtualizadoEm.
func (u *Uniforme) AtualizarTamanhos(camisa, short, chuteira string) error {
	if camisa == "" || short == "" || chuteira == "" {
		return shared.Newf(shared.ErrDomainViolation,
			"tam_camisa, tam_short e tam_chuteira são obrigatórios")
	}
	u.TamCamisa = camisa
	u.TamShort = short
	u.TamChuteira = chuteira
	u.AtualizadoEm = time.Now().UTC()
	return nil
}
