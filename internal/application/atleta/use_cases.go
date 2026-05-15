// Package atleta contém os casos de uso do contexto Atletas.
package atleta

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	domainatleta "github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// ─────────────────────────────────────────────────────────────────────────────
// CADASTRAR
// ─────────────────────────────────────────────────────────────────────────────

type CadastrarAtletaInput struct {
	Nome           string
	DataNascimento time.Time
	CPF            *string
	RG             *string
	Endereco       *string
	Cidade         *string
	UF             *string
	CEP            *string
	Email          *string
	Telefone       *string
}

type CadastrarAtletaUseCase struct {
	atletas domainatleta.Repository
}

func NewCadastrarAtletaUseCase(atletas domainatleta.Repository) *CadastrarAtletaUseCase {
	return &CadastrarAtletaUseCase{atletas: atletas}
}

func (uc *CadastrarAtletaUseCase) Execute(ctx context.Context, in CadastrarAtletaInput) (*domainatleta.Atleta, error) {
	if in.CPF != nil {
		existente, err := uc.atletas.GetByCPF(ctx, *in.CPF)
		if err != nil {
			return nil, fmt.Errorf("verificar CPF existente: %w", err)
		}
		if existente != nil {
			return nil, shared.Newf(shared.ErrConflict, fmt.Sprintf("CPF %s já cadastrado", *in.CPF))
		}
	}

	a, err := domainatleta.New(in.Nome, in.DataNascimento)
	if err != nil {
		return nil, err
	}
	if in.CPF != nil {
		if err := a.SetCPF(*in.CPF); err != nil {
			return nil, err
		}
	}
	a.RG = in.RG
	a.Endereco = in.Endereco
	a.Cidade = in.Cidade
	a.UF = in.UF
	a.CEP = in.CEP
	a.Email = in.Email
	a.Telefone = in.Telefone

	if err := uc.atletas.Save(ctx, a); err != nil {
		return nil, fmt.Errorf("salvar atleta: %w", err)
	}
	return a, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// ATUALIZAR
// ─────────────────────────────────────────────────────────────────────────────

type AtualizarAtletaInput struct {
	ID             uuid.UUID
	Nome           string
	DataNascimento time.Time
	CPF            *string
	RG             *string
	Endereco       *string
	Cidade         *string
	UF             *string
	CEP            *string
	Email          *string
	Telefone       *string
}

type AtualizarAtletaUseCase struct {
	atletas domainatleta.Repository
}

func NewAtualizarAtletaUseCase(atletas domainatleta.Repository) *AtualizarAtletaUseCase {
	return &AtualizarAtletaUseCase{atletas: atletas}
}

func (uc *AtualizarAtletaUseCase) Execute(ctx context.Context, in AtualizarAtletaInput) (*domainatleta.Atleta, error) {
	a, err := uc.atletas.GetByID(ctx, in.ID)
	if err != nil {
		return nil, fmt.Errorf("buscar atleta: %w", err)
	}
	if a == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("atleta %s não encontrado", in.ID))
	}

	if in.CPF != nil && (a.CPF == nil || *in.CPF != *a.CPF) {
		conflito, err := uc.atletas.GetByCPF(ctx, *in.CPF)
		if err != nil {
			return nil, fmt.Errorf("verificar CPF existente: %w", err)
		}
		if conflito != nil && conflito.ID != a.ID {
			return nil, shared.Newf(shared.ErrConflict, fmt.Sprintf("CPF %s já cadastrado", *in.CPF))
		}
		if err := a.SetCPF(*in.CPF); err != nil {
			return nil, err
		}
	}

	if in.Nome != "" {
		a.Nome = in.Nome
	}
	if !in.DataNascimento.IsZero() {
		a.DataNascimento = in.DataNascimento
	}
	a.RG = in.RG
	a.Endereco = in.Endereco
	a.Cidade = in.Cidade
	a.UF = in.UF
	a.CEP = in.CEP
	a.Email = in.Email
	a.Telefone = in.Telefone
	a.AtualizadoEm = time.Now().UTC()

	if err := uc.atletas.Save(ctx, a); err != nil {
		return nil, fmt.Errorf("salvar atleta: %w", err)
	}
	return a, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// MUDAR STATUS (inativar / suspender / reativar)
// ─────────────────────────────────────────────────────────────────────────────

// AcaoStatus é a ação aplicada à entidade Atleta.
type AcaoStatus string

const (
	AcaoInativar  AcaoStatus = "INATIVAR"
	AcaoSuspender AcaoStatus = "SUSPENDER"
	AcaoReativar  AcaoStatus = "REATIVAR"
)

type MudarStatusAtletaUseCase struct {
	atletas domainatleta.Repository
}

func NewMudarStatusAtletaUseCase(atletas domainatleta.Repository) *MudarStatusAtletaUseCase {
	return &MudarStatusAtletaUseCase{atletas: atletas}
}

func (uc *MudarStatusAtletaUseCase) Execute(ctx context.Context, id uuid.UUID, acao AcaoStatus) (*domainatleta.Atleta, error) {
	a, err := uc.atletas.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscar atleta: %w", err)
	}
	if a == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("atleta %s não encontrado", id))
	}

	switch acao {
	case AcaoInativar:
		if err := a.Inativar(); err != nil {
			return nil, err
		}
	case AcaoSuspender:
		if err := a.Suspender(); err != nil {
			return nil, err
		}
	case AcaoReativar:
		a.Reativar()
	default:
		return nil, shared.Newf(shared.ErrDomainViolation, fmt.Sprintf("ação inválida: %s", acao))
	}

	if err := uc.atletas.Save(ctx, a); err != nil {
		return nil, fmt.Errorf("salvar atleta: %w", err)
	}
	return a, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVER (soft delete)
// ─────────────────────────────────────────────────────────────────────────────

type RemoverAtletaUseCase struct {
	atletas domainatleta.Repository
}

func NewRemoverAtletaUseCase(atletas domainatleta.Repository) *RemoverAtletaUseCase {
	return &RemoverAtletaUseCase{atletas: atletas}
}

func (uc *RemoverAtletaUseCase) Execute(ctx context.Context, id uuid.UUID) error {
	a, err := uc.atletas.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("buscar atleta: %w", err)
	}
	if a == nil {
		return shared.Newf(shared.ErrNotFound, fmt.Sprintf("atleta %s não encontrado", id))
	}
	if err := uc.atletas.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("remover atleta: %w", err)
	}
	return nil
}
