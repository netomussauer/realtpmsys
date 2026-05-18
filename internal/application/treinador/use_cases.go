// Package treinador contém os casos de uso do contexto Treinadores.
package treinador

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	domtreinador "github.com/realtpmsys/realtpmsys/internal/domain/treinador"
)

// ─────────────────────────────────────────────────────────────────────────────
// CADASTRAR
// ─────────────────────────────────────────────────────────────────────────────

type CadastrarTreinadorInput struct {
	UsuarioID uuid.UUID
	Nome      string
	CPF       *string
	CREF      *string
	Telefone  *string
}

type CadastrarTreinadorUseCase struct {
	treinadores domtreinador.Repository
	usuarios    identidade.Repository
}

func NewCadastrarTreinadorUseCase(treinadores domtreinador.Repository, usuarios identidade.Repository) *CadastrarTreinadorUseCase {
	return &CadastrarTreinadorUseCase{treinadores: treinadores, usuarios: usuarios}
}

func (uc *CadastrarTreinadorUseCase) Execute(ctx context.Context, in CadastrarTreinadorInput) (*domtreinador.Treinador, error) {
	// Usuário precisa existir
	u, err := uc.usuarios.GetByID(ctx, in.UsuarioID)
	if err != nil {
		return nil, fmt.Errorf("buscar usuário: %w", err)
	}
	if u == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("usuário %s não encontrado", in.UsuarioID))
	}

	// Um usuário só pode ter um treinador associado
	existente, err := uc.treinadores.GetByUsuarioID(ctx, in.UsuarioID)
	if err != nil {
		return nil, fmt.Errorf("verificar treinador existente: %w", err)
	}
	if existente != nil {
		return nil, shared.Newf(shared.ErrConflict,
			fmt.Sprintf("usuário %s já vinculado ao treinador %s", in.UsuarioID, existente.ID))
	}

	// CPF único quando informado
	if in.CPF != nil {
		porCPF, err := uc.treinadores.GetByCPF(ctx, *in.CPF)
		if err != nil {
			return nil, fmt.Errorf("verificar CPF: %w", err)
		}
		if porCPF != nil {
			return nil, shared.Newf(shared.ErrConflict, fmt.Sprintf("CPF %s já cadastrado", *in.CPF))
		}
	}

	t, err := domtreinador.New(in.UsuarioID, in.Nome)
	if err != nil {
		return nil, err
	}
	if in.CPF != nil {
		if err := t.SetCPF(*in.CPF); err != nil {
			return nil, err
		}
	}
	t.CREF = in.CREF
	t.Telefone = in.Telefone

	if err := uc.treinadores.Save(ctx, t); err != nil {
		return nil, fmt.Errorf("salvar treinador: %w", err)
	}
	return t, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// ATUALIZAR
// ─────────────────────────────────────────────────────────────────────────────

type AtualizarTreinadorInput struct {
	ID       uuid.UUID
	Nome     string
	CPF      *string
	CREF     *string
	Telefone *string
}

type AtualizarTreinadorUseCase struct {
	treinadores domtreinador.Repository
}

func NewAtualizarTreinadorUseCase(treinadores domtreinador.Repository) *AtualizarTreinadorUseCase {
	return &AtualizarTreinadorUseCase{treinadores: treinadores}
}

func (uc *AtualizarTreinadorUseCase) Execute(ctx context.Context, in AtualizarTreinadorInput) (*domtreinador.Treinador, error) {
	t, err := uc.treinadores.GetByID(ctx, in.ID)
	if err != nil {
		return nil, fmt.Errorf("buscar treinador: %w", err)
	}
	if t == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("treinador %s não encontrado", in.ID))
	}

	if in.CPF != nil && (t.CPF == nil || *in.CPF != *t.CPF) {
		conflito, err := uc.treinadores.GetByCPF(ctx, *in.CPF)
		if err != nil {
			return nil, fmt.Errorf("verificar CPF: %w", err)
		}
		if conflito != nil && conflito.ID != t.ID {
			return nil, shared.Newf(shared.ErrConflict, fmt.Sprintf("CPF %s já cadastrado", *in.CPF))
		}
		if err := t.SetCPF(*in.CPF); err != nil {
			return nil, err
		}
	}

	if in.Nome != "" {
		t.Nome = in.Nome
	}
	t.CREF = in.CREF
	t.Telefone = in.Telefone
	t.AtualizadoEm = time.Now().UTC()

	if err := uc.treinadores.Save(ctx, t); err != nil {
		return nil, fmt.Errorf("salvar treinador: %w", err)
	}
	return t, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// MUDAR STATUS
// ─────────────────────────────────────────────────────────────────────────────

type AcaoStatus string

const (
	AcaoInativar AcaoStatus = "INATIVAR"
	AcaoAtivar   AcaoStatus = "ATIVAR"
)

type MudarStatusTreinadorUseCase struct {
	treinadores domtreinador.Repository
}

func NewMudarStatusTreinadorUseCase(treinadores domtreinador.Repository) *MudarStatusTreinadorUseCase {
	return &MudarStatusTreinadorUseCase{treinadores: treinadores}
}

func (uc *MudarStatusTreinadorUseCase) Execute(ctx context.Context, id uuid.UUID, acao AcaoStatus) (*domtreinador.Treinador, error) {
	t, err := uc.treinadores.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscar treinador: %w", err)
	}
	if t == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("treinador %s não encontrado", id))
	}
	switch acao {
	case AcaoInativar:
		if err := t.Inativar(); err != nil {
			return nil, err
		}
	case AcaoAtivar:
		if err := t.Ativar(); err != nil {
			return nil, err
		}
	default:
		return nil, shared.Newf(shared.ErrDomainViolation, fmt.Sprintf("ação inválida: %s", acao))
	}
	if err := uc.treinadores.Save(ctx, t); err != nil {
		return nil, fmt.Errorf("salvar treinador: %w", err)
	}
	return t, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// REMOVER (soft delete)
// ─────────────────────────────────────────────────────────────────────────────

type RemoverTreinadorUseCase struct {
	treinadores domtreinador.Repository
}

func NewRemoverTreinadorUseCase(treinadores domtreinador.Repository) *RemoverTreinadorUseCase {
	return &RemoverTreinadorUseCase{treinadores: treinadores}
}

func (uc *RemoverTreinadorUseCase) Execute(ctx context.Context, id uuid.UUID) error {
	t, err := uc.treinadores.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("buscar treinador: %w", err)
	}
	if t == nil {
		return shared.Newf(shared.ErrNotFound, fmt.Sprintf("treinador %s não encontrado", id))
	}
	if err := uc.treinadores.SoftDelete(ctx, id); err != nil {
		return fmt.Errorf("remover treinador: %w", err)
	}
	return nil
}
