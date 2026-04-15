// Package financeiro contém os casos de uso do contexto Financeiro.
// Orquestra domínio + repositórios. Sem dependência de Chi, pgx ou qualquer framework.
package financeiro

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/shopspring/decimal"
)

// ─────────────────────────────────────────────────────────────────────────────
// FIRMAR CONTRATO
// ─────────────────────────────────────────────────────────────────────────────

// FirmarContratoInput encapsula os dados de entrada do caso de uso.
type FirmarContratoInput struct {
	AtletaID        uuid.UUID
	PlanoID         uuid.UUID
	DataInicio      time.Time
	ValorContratado *decimal.Decimal // nil = usa valor atual do plano
}

// FirmarContratoUseCase vincula um atleta a um plano.
type FirmarContratoUseCase struct {
	contratos financeiro.ContratoRepository
	planos    financeiro.PlanoRepository
}

func NewFirmarContratoUseCase(
	contratos financeiro.ContratoRepository,
	planos financeiro.PlanoRepository,
) *FirmarContratoUseCase {
	return &FirmarContratoUseCase{contratos: contratos, planos: planos}
}

func (uc *FirmarContratoUseCase) Execute(ctx context.Context, in FirmarContratoInput) (*financeiro.Contrato, error) {
	// Regra: atleta não pode ter dois contratos ativos simultaneamente
	existente, err := uc.contratos.GetAtivoPorAtleta(ctx, in.AtletaID)
	if err != nil {
		return nil, fmt.Errorf("verificar contrato ativo: %w", err)
	}
	if existente != nil {
		return nil, shared.Newf(shared.ErrContratoAtivoExistente,
			fmt.Sprintf("contrato %s já está ativo", existente.ID))
	}

	plano, err := uc.planos.GetByID(ctx, in.PlanoID)
	if err != nil {
		return nil, fmt.Errorf("buscar plano: %w", err)
	}
	if plano == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("plano %s não encontrado", in.PlanoID))
	}
	if !plano.Ativo {
		return nil, shared.ErrPlanoInativo
	}

	// Usa o valor do plano se não foi informado valor específico
	valor := plano.ValorMensal
	if in.ValorContratado != nil {
		valor = *in.ValorContratado
	}

	contrato, err := financeiro.NewContrato(in.AtletaID, in.PlanoID, in.DataInicio, valor)
	if err != nil {
		return nil, err
	}

	if err := uc.contratos.Save(ctx, contrato); err != nil {
		return nil, fmt.Errorf("salvar contrato: %w", err)
	}
	return contrato, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// GERAR MENSALIDADES
// ─────────────────────────────────────────────────────────────────────────────

// GerarMensalidadesInput especifica a competência alvo.
type GerarMensalidadesInput struct {
	CompetenciaAno int
	CompetenciaMes int
}

// GerarMensalidadesResult resume o resultado da geração em lote.
type GerarMensalidadesResult struct {
	Geradas   int
	Ignoradas int // já existiam — idempotência
	ComErro   int
}

// GerarMensalidadesUseCase gera cobranças mensais para todos os contratos ativos.
// É idempotente: re-execução no mesmo mês não duplica mensalidades.
type GerarMensalidadesUseCase struct {
	contratos    financeiro.ContratoRepository
	mensalidades financeiro.MensalidadeRepository
	planos       financeiro.PlanoRepository
	gerador      *financeiro.GeradorMensalidadeService
}

func NewGerarMensalidadesUseCase(
	contratos financeiro.ContratoRepository,
	mensalidades financeiro.MensalidadeRepository,
	planos financeiro.PlanoRepository,
) *GerarMensalidadesUseCase {
	return &GerarMensalidadesUseCase{
		contratos:    contratos,
		mensalidades: mensalidades,
		planos:       planos,
		gerador:      &financeiro.GeradorMensalidadeService{},
	}
}

func (uc *GerarMensalidadesUseCase) Execute(ctx context.Context, in GerarMensalidadesInput) (GerarMensalidadesResult, error) {
	contratos, err := uc.contratos.ListAtivos(ctx)
	if err != nil {
		return GerarMensalidadesResult{}, fmt.Errorf("listar contratos ativos: %w", err)
	}

	var result GerarMensalidadesResult
	var novas []*financeiro.Mensalidade

	for _, contrato := range contratos {
		// Idempotência: verifica antes de criar
		existente, err := uc.mensalidades.GetByContratoCompetencia(ctx, contrato.ID, in.CompetenciaAno, in.CompetenciaMes)
		if err != nil {
			result.ComErro++
			continue
		}
		if existente != nil {
			result.Ignoradas++
			continue
		}

		plano, err := uc.planos.GetByID(ctx, contrato.PlanoID)
		if err != nil || plano == nil {
			result.ComErro++
			continue
		}

		mensalidade := uc.gerador.Gerar(contrato, plano.DiaVencimento, in.CompetenciaAno, in.CompetenciaMes)
		novas = append(novas, mensalidade)
		result.Geradas++
	}

	if len(novas) > 0 {
		if err := uc.mensalidades.SaveBatch(ctx, novas); err != nil {
			return GerarMensalidadesResult{}, fmt.Errorf("salvar mensalidades em lote: %w", err)
		}
	}

	return result, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRAR PAGAMENTO
// ─────────────────────────────────────────────────────────────────────────────

// RegistrarPagamentoInput encapsula os dados do pagamento.
type RegistrarPagamentoInput struct {
	MensalidadeID  uuid.UUID
	ValorPago      decimal.Decimal
	DataPagamento  time.Time
	FormaPagamento string
	Observacao     *string
}

// RegistrarPagamentoUseCase registra o pagamento de uma mensalidade.
type RegistrarPagamentoUseCase struct {
	mensalidades financeiro.MensalidadeRepository
}

func NewRegistrarPagamentoUseCase(mensalidades financeiro.MensalidadeRepository) *RegistrarPagamentoUseCase {
	return &RegistrarPagamentoUseCase{mensalidades: mensalidades}
}

func (uc *RegistrarPagamentoUseCase) Execute(ctx context.Context, in RegistrarPagamentoInput) (*financeiro.Mensalidade, error) {
	mensalidade, err := uc.mensalidades.GetByID(ctx, in.MensalidadeID)
	if err != nil {
		return nil, fmt.Errorf("buscar mensalidade: %w", err)
	}
	if mensalidade == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("mensalidade %s não encontrada", in.MensalidadeID))
	}

	// Regra de domínio: RegistrarPagamento retorna erro se já paga ou cancelada
	if err := mensalidade.RegistrarPagamento(
		in.ValorPago,
		in.DataPagamento,
		in.FormaPagamento,
		in.Observacao,
	); err != nil {
		return nil, err
	}

	if err := uc.mensalidades.Save(ctx, mensalidade); err != nil {
		return nil, fmt.Errorf("salvar pagamento: %w", err)
	}
	return mensalidade, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAR MENSALIDADE
// ─────────────────────────────────────────────────────────────────────────────

// CancelarMensalidadeUseCase cancela uma mensalidade pendente ou vencida.
type CancelarMensalidadeUseCase struct {
	mensalidades financeiro.MensalidadeRepository
}

func NewCancelarMensalidadeUseCase(mensalidades financeiro.MensalidadeRepository) *CancelarMensalidadeUseCase {
	return &CancelarMensalidadeUseCase{mensalidades: mensalidades}
}

func (uc *CancelarMensalidadeUseCase) Execute(ctx context.Context, id uuid.UUID) (*financeiro.Mensalidade, error) {
	mensalidade, err := uc.mensalidades.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscar mensalidade: %w", err)
	}
	if mensalidade == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("mensalidade %s não encontrada", id))
	}

	if err := mensalidade.Cancelar(); err != nil {
		return nil, err
	}

	if err := uc.mensalidades.Save(ctx, mensalidade); err != nil {
		return nil, fmt.Errorf("salvar cancelamento: %w", err)
	}
	return mensalidade, nil
}
