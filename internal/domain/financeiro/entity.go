// Package financeiro contém as entidades do contexto Financeiro.
package financeiro

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/shopspring/decimal"
)

// ─────────────────────────────────────────────────────────────────────────────
// PLANO
// ─────────────────────────────────────────────────────────────────────────────

// Plano define os parâmetros de cobrança de mensalidades.
type Plano struct {
	ID              uuid.UUID
	Nome            string
	DiasSemana      int
	ValorMensal     decimal.Decimal
	DiaVencimento   int
	Ativo           bool
	CriadoEm       time.Time
	AtualizadoEm   time.Time
}

// NewPlano cria um Plano validado.
func NewPlano(nome string, diasSemana int, valorMensal decimal.Decimal, diaVencimento int) (*Plano, error) {
	if diasSemana != 2 && diasSemana != 3 && diasSemana != 5 {
		return nil, shared.ErrDiasSemanasInvalido
	}
	if !valorMensal.IsPositive() {
		return nil, shared.ErrValorInvalido
	}
	if diaVencimento < 1 || diaVencimento > 28 {
		return nil, shared.ErrDiaVencimentoInvalido
	}
	now := time.Now().UTC()
	return &Plano{
		ID:            uuid.New(),
		Nome:          nome,
		DiasSemana:    diasSemana,
		ValorMensal:   valorMensal,
		DiaVencimento: diaVencimento,
		Ativo:         true,
		CriadoEm:     now,
		AtualizadoEm: now,
	}, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// CONTRATO
// ─────────────────────────────────────────────────────────────────────────────

// StatusContrato representa o ciclo de vida do contrato.
type StatusContrato string

const (
	ContratoAtivo     StatusContrato = "ATIVO"
	ContratoCancelado StatusContrato = "CANCELADO"
	ContratoEncerrado StatusContrato = "ENCERRADO"
)

// Contrato vincula um Atleta a um Plano com valor acordado.
type Contrato struct {
	ID               uuid.UUID
	AtletaID         uuid.UUID
	PlanoID          uuid.UUID
	DataInicio       time.Time
	DataFim          *time.Time
	ValorContratado  decimal.Decimal
	Status           StatusContrato
	CriadoEm        time.Time
	AtualizadoEm    time.Time
}

// NewContrato cria um Contrato validado.
func NewContrato(atletaID, planoID uuid.UUID, dataInicio time.Time, valorContratado decimal.Decimal) (*Contrato, error) {
	if !valorContratado.IsPositive() {
		return nil, shared.ErrValorInvalido
	}
	now := time.Now().UTC()
	return &Contrato{
		ID:              uuid.New(),
		AtletaID:        atletaID,
		PlanoID:         planoID,
		DataInicio:      dataInicio,
		ValorContratado: valorContratado,
		Status:          ContratoAtivo,
		CriadoEm:       now,
		AtualizadoEm:   now,
	}, nil
}

// Cancelar encerra o contrato com a data atual.
func (c *Contrato) Cancelar() error {
	if c.Status != ContratoAtivo {
		return shared.Newf(shared.ErrDomainViolation, fmt.Sprintf("somente contratos ATIVOS podem ser cancelados, status atual: %s", c.Status))
	}
	now := time.Now().UTC()
	c.Status = ContratoCancelado
	c.DataFim = &now
	c.AtualizadoEm = now
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// MENSALIDADE
// ─────────────────────────────────────────────────────────────────────────────

// StatusMensalidade representa o ciclo de vida da mensalidade.
type StatusMensalidade string

const (
	MensalidadePendente  StatusMensalidade = "PENDENTE"
	MensalidadePago      StatusMensalidade = "PAGO"
	MensalidadeVencido   StatusMensalidade = "VENCIDO"
	MensalidadeCancelado StatusMensalidade = "CANCELADO"
	MensalidadeIsento    StatusMensalidade = "ISENTO"
)

// Mensalidade é o Aggregate Root do contexto Financeiro.
type Mensalidade struct {
	ID              uuid.UUID
	ContratoID      uuid.UUID
	AtletaID        uuid.UUID
	CompetenciaAno  int
	CompetenciaMes  int
	DataVencimento  time.Time
	Valor           decimal.Decimal
	ValorPago       *decimal.Decimal
	Status          StatusMensalidade
	DataPagamento   *time.Time
	FormaPagamento  *string
	Observacao      *string
	CriadoEm       time.Time
	AtualizadoEm   time.Time
}

// RegistrarPagamento aplica o pagamento à mensalidade.
// Retorna erro se a mensalidade já estiver paga ou cancelada.
func (m *Mensalidade) RegistrarPagamento(valor decimal.Decimal, data time.Time, forma string, obs *string) error {
	if m.Status == MensalidadePago {
		return shared.Newf(shared.ErrMensalidadeJaPaga,
			fmt.Sprintf("paga em %s", m.DataPagamento.Format("2006-01-02")))
	}
	if m.Status == MensalidadeCancelado {
		return shared.ErrMensalidadeCancelada
	}
	now := time.Now().UTC()
	m.ValorPago = &valor
	m.DataPagamento = &data
	m.FormaPagamento = &forma
	m.Observacao = obs
	m.Status = MensalidadePago
	m.AtualizadoEm = now
	return nil
}

// Cancelar muda o status para CANCELADO.
func (m *Mensalidade) Cancelar() error {
	if m.Status == MensalidadePago {
		return shared.ErrMensalidadePagaNaoPodeSerCancelada
	}
	m.Status = MensalidadeCancelado
	m.AtualizadoEm = time.Now().UTC()
	return nil
}

// MarcarVencida atualiza o status para VENCIDO se a data passou.
// Chamada pelo job diário — idempotente.
func (m *Mensalidade) MarcarVencida() bool {
	if m.Status == MensalidadePendente && time.Now().After(m.DataVencimento) {
		m.Status = MensalidadeVencido
		m.AtualizadoEm = time.Now().UTC()
		return true
	}
	return false
}
