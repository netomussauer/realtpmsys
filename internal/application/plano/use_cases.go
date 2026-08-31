// Package plano contém os casos de uso de criação/consulta de Planos.
// O contexto de domínio (entidade Plano) vive em internal/domain/financeiro,
// junto com Contrato e Mensalidade — este pacote só orquestra o caso de uso
// de criação, que antes não existia (Plano só era lido via GetByID/ListAtivos
// a partir de FirmarContratoUseCase e GerarMensalidadesUseCase).
package plano

import (
	"context"
	"fmt"

	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/shopspring/decimal"
)

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR
// ─────────────────────────────────────────────────────────────────────────────

type CriarPlanoInput struct {
	Nome          string
	DiasSemana    int
	ValorMensal   decimal.Decimal
	DiaVencimento int
}

type CriarPlanoUseCase struct {
	planos financeiro.PlanoRepository
}

func NewCriarPlanoUseCase(planos financeiro.PlanoRepository) *CriarPlanoUseCase {
	return &CriarPlanoUseCase{planos: planos}
}

func (uc *CriarPlanoUseCase) Execute(ctx context.Context, in CriarPlanoInput) (*financeiro.Plano, error) {
	p, err := financeiro.NewPlano(in.Nome, in.DiasSemana, in.ValorMensal, in.DiaVencimento)
	if err != nil {
		return nil, err
	}
	if err := uc.planos.Save(ctx, p); err != nil {
		return nil, fmt.Errorf("salvar plano: %w", err)
	}
	return p, nil
}
