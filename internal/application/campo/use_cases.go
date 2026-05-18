// Package campo contém os casos de uso do contexto Campos.
package campo

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	domcampo "github.com/realtpmsys/realtpmsys/internal/domain/campo"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR
// ─────────────────────────────────────────────────────────────────────────────

type CriarCampoInput struct {
	Nome          string
	Endereco      *string
	CapacidadeMax *int
}

type CriarCampoUseCase struct {
	campos domcampo.Repository
}

func NewCriarCampoUseCase(campos domcampo.Repository) *CriarCampoUseCase {
	return &CriarCampoUseCase{campos: campos}
}

func (uc *CriarCampoUseCase) Execute(ctx context.Context, in CriarCampoInput) (*domcampo.Campo, error) {
	c, err := domcampo.New(in.Nome, in.CapacidadeMax)
	if err != nil {
		return nil, err
	}
	c.Endereco = in.Endereco
	if err := uc.campos.Save(ctx, c); err != nil {
		return nil, fmt.Errorf("salvar campo: %w", err)
	}
	return c, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// ATUALIZAR
// ─────────────────────────────────────────────────────────────────────────────

type AtualizarCampoInput struct {
	ID            uuid.UUID
	Nome          string
	Endereco      *string
	CapacidadeMax *int
}

type AtualizarCampoUseCase struct {
	campos domcampo.Repository
}

func NewAtualizarCampoUseCase(campos domcampo.Repository) *AtualizarCampoUseCase {
	return &AtualizarCampoUseCase{campos: campos}
}

func (uc *AtualizarCampoUseCase) Execute(ctx context.Context, in AtualizarCampoInput) (*domcampo.Campo, error) {
	c, err := uc.campos.GetByID(ctx, in.ID)
	if err != nil {
		return nil, fmt.Errorf("buscar campo: %w", err)
	}
	if c == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("campo %s não encontrado", in.ID))
	}
	if in.Nome == "" {
		return nil, shared.Newf(shared.ErrDomainViolation, "nome do campo é obrigatório")
	}
	if in.CapacidadeMax != nil && *in.CapacidadeMax <= 0 {
		return nil, shared.Newf(shared.ErrDomainViolation, "capacidade_max deve ser positiva")
	}
	c.Nome = in.Nome
	c.Endereco = in.Endereco
	c.CapacidadeMax = in.CapacidadeMax
	if err := uc.campos.Save(ctx, c); err != nil {
		return nil, fmt.Errorf("salvar campo: %w", err)
	}
	return c, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// TOGGLE ATIVO
// ─────────────────────────────────────────────────────────────────────────────

type ToggleCampoUseCase struct {
	campos domcampo.Repository
}

func NewToggleCampoUseCase(campos domcampo.Repository) *ToggleCampoUseCase {
	return &ToggleCampoUseCase{campos: campos}
}

// Execute define o campo como ativo (`ativar=true`) ou inativo (`ativar=false`).
func (uc *ToggleCampoUseCase) Execute(ctx context.Context, id uuid.UUID, ativar bool) (*domcampo.Campo, error) {
	c, err := uc.campos.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscar campo: %w", err)
	}
	if c == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("campo %s não encontrado", id))
	}
	if ativar {
		c.Ativar()
	} else {
		c.Inativar()
	}
	if err := uc.campos.Save(ctx, c); err != nil {
		return nil, fmt.Errorf("salvar campo: %w", err)
	}
	return c, nil
}
