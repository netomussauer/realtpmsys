package atleta

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	domainatleta "github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// ─────────────────────────────────────────────────────────────────────────────
// ADICIONAR RESPONSAVEL
// ─────────────────────────────────────────────────────────────────────────────

type AdicionarResponsavelInput struct {
	AtletaID         uuid.UUID
	Nome             string
	Telefone         string
	Parentesco       domainatleta.Parentesco
	CPF              *string
	Email            *string
	ContatoPrincipal bool
}

type AdicionarResponsavelUseCase struct {
	atletas       domainatleta.Repository
	responsaveis  domainatleta.ResponsavelRepository
}

func NewAdicionarResponsavelUseCase(
	atletas domainatleta.Repository,
	responsaveis domainatleta.ResponsavelRepository,
) *AdicionarResponsavelUseCase {
	return &AdicionarResponsavelUseCase{atletas: atletas, responsaveis: responsaveis}
}

func (uc *AdicionarResponsavelUseCase) Execute(ctx context.Context, in AdicionarResponsavelInput) (*domainatleta.Responsavel, error) {
	a, err := uc.atletas.GetByID(ctx, in.AtletaID)
	if err != nil {
		return nil, fmt.Errorf("buscar atleta: %w", err)
	}
	if a == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("atleta %s não encontrado", in.AtletaID))
	}

	if in.CPF != nil {
		porCPF, err := uc.responsaveis.GetByCPF(ctx, *in.CPF)
		if err != nil {
			return nil, fmt.Errorf("verificar CPF: %w", err)
		}
		if porCPF != nil {
			return nil, shared.Newf(shared.ErrConflict, fmt.Sprintf("CPF %s já cadastrado em outro responsável", *in.CPF))
		}
	}

	r, err := domainatleta.NewResponsavel(in.AtletaID, in.Nome, in.Telefone, in.Parentesco)
	if err != nil {
		return nil, err
	}
	if in.CPF != nil {
		if err := r.SetCPF(*in.CPF); err != nil {
			return nil, err
		}
	}
	if in.Email != nil {
		e := *in.Email
		r.Email = &e
	}
	if in.ContatoPrincipal {
		r.MarcarComoPrincipal()
	}

	if err := uc.responsaveis.SaveWithPrincipalSwap(ctx, r); err != nil {
		return nil, fmt.Errorf("salvar responsável: %w", err)
	}
	return r, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// ATUALIZAR RESPONSAVEL
// ─────────────────────────────────────────────────────────────────────────────

type AtualizarResponsavelInput struct {
	ID               uuid.UUID
	Nome             string
	Telefone         string
	Parentesco       domainatleta.Parentesco
	CPF              *string
	Email            *string
	ContatoPrincipal bool
}

type AtualizarResponsavelUseCase struct {
	responsaveis domainatleta.ResponsavelRepository
}

func NewAtualizarResponsavelUseCase(responsaveis domainatleta.ResponsavelRepository) *AtualizarResponsavelUseCase {
	return &AtualizarResponsavelUseCase{responsaveis: responsaveis}
}

func (uc *AtualizarResponsavelUseCase) Execute(ctx context.Context, in AtualizarResponsavelInput) (*domainatleta.Responsavel, error) {
	r, err := uc.responsaveis.GetByID(ctx, in.ID)
	if err != nil {
		return nil, fmt.Errorf("buscar responsável: %w", err)
	}
	if r == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("responsável %s não encontrado", in.ID))
	}

	if in.CPF != nil && (r.CPF == nil || *in.CPF != *r.CPF) {
		porCPF, err := uc.responsaveis.GetByCPF(ctx, *in.CPF)
		if err != nil {
			return nil, fmt.Errorf("verificar CPF: %w", err)
		}
		if porCPF != nil && porCPF.ID != r.ID {
			return nil, shared.Newf(shared.ErrConflict, fmt.Sprintf("CPF %s já cadastrado", *in.CPF))
		}
		if err := r.SetCPF(*in.CPF); err != nil {
			return nil, err
		}
	} else if in.CPF == nil {
		r.CPF = nil
	}

	if in.Nome != "" {
		r.Nome = in.Nome
	}
	if in.Telefone != "" {
		r.Telefone = in.Telefone
	}
	if in.Parentesco != "" {
		if !domainatleta.IsValidParentesco(in.Parentesco) {
			return nil, shared.Newf(shared.ErrDomainViolation, "parentesco inválido: "+string(in.Parentesco))
		}
		r.Parentesco = in.Parentesco
	}
	if in.Email != nil {
		e := *in.Email
		r.Email = &e
	} else {
		r.Email = nil
	}
	r.ContatoPrincipal = in.ContatoPrincipal

	if err := uc.responsaveis.SaveWithPrincipalSwap(ctx, r); err != nil {
		return nil, fmt.Errorf("salvar responsável: %w", err)
	}
	return r, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVER RESPONSAVEL
// ─────────────────────────────────────────────────────────────────────────────

type RemoverResponsavelUseCase struct {
	responsaveis domainatleta.ResponsavelRepository
}

func NewRemoverResponsavelUseCase(responsaveis domainatleta.ResponsavelRepository) *RemoverResponsavelUseCase {
	return &RemoverResponsavelUseCase{responsaveis: responsaveis}
}

func (uc *RemoverResponsavelUseCase) Execute(ctx context.Context, id uuid.UUID) error {
	r, err := uc.responsaveis.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("buscar responsável: %w", err)
	}
	if r == nil {
		return shared.Newf(shared.ErrNotFound, fmt.Sprintf("responsável %s não encontrado", id))
	}
	if err := uc.responsaveis.Delete(ctx, id); err != nil {
		return fmt.Errorf("remover responsável: %w", err)
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// SET UNIFORME (upsert por atleta)
// ─────────────────────────────────────────────────────────────────────────────

type SetUniformeInput struct {
	AtletaID    uuid.UUID
	TamCamisa   string
	TamShort    string
	TamChuteira string
}

type SetUniformeUseCase struct {
	atletas   domainatleta.Repository
	uniformes domainatleta.UniformeRepository
}

func NewSetUniformeUseCase(atletas domainatleta.Repository, uniformes domainatleta.UniformeRepository) *SetUniformeUseCase {
	return &SetUniformeUseCase{atletas: atletas, uniformes: uniformes}
}

func (uc *SetUniformeUseCase) Execute(ctx context.Context, in SetUniformeInput) (*domainatleta.Uniforme, error) {
	a, err := uc.atletas.GetByID(ctx, in.AtletaID)
	if err != nil {
		return nil, fmt.Errorf("buscar atleta: %w", err)
	}
	if a == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("atleta %s não encontrado", in.AtletaID))
	}

	existente, err := uc.uniformes.GetByAtleta(ctx, in.AtletaID)
	if err != nil {
		return nil, fmt.Errorf("buscar uniforme atual: %w", err)
	}
	if existente != nil {
		if err := existente.AtualizarTamanhos(in.TamCamisa, in.TamShort, in.TamChuteira); err != nil {
			return nil, err
		}
		if err := uc.uniformes.Save(ctx, existente); err != nil {
			return nil, fmt.Errorf("salvar uniforme: %w", err)
		}
		return existente, nil
	}

	u, err := domainatleta.NewUniforme(in.AtletaID, in.TamCamisa, in.TamShort, in.TamChuteira)
	if err != nil {
		return nil, err
	}
	if err := uc.uniformes.Save(ctx, u); err != nil {
		return nil, fmt.Errorf("salvar uniforme: %w", err)
	}
	return u, nil
}
