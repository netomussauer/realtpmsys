package financeiro

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// GeradorMensalidadeService é um Domain Service puro.
// Gera objetos Mensalidade sem acesso a banco — 100% testável sem I/O.
type GeradorMensalidadeService struct{}

// Gerar cria uma Mensalidade para o contrato na competência informada.
// Não persiste: o use case decide se salva ou ignora (idempotência).
func (s *GeradorMensalidadeService) Gerar(
	contrato *Contrato,
	diaVencimento int,
	ano, mes int,
) *Mensalidade {
	dataVencimento := calcularDataVencimento(ano, mes, diaVencimento)
	now := time.Now().UTC()
	return &Mensalidade{
		ID:             uuid.New(),
		ContratoID:     contrato.ID,
		AtletaID:       contrato.AtletaID,
		CompetenciaAno: ano,
		CompetenciaMes: mes,
		DataVencimento: dataVencimento,
		Valor:          contrato.ValorContratado,
		Status:         MensalidadePendente,
		CriadoEm:      now,
		AtualizadoEm:  now,
	}
}

// calcularDataVencimento retorna a data de vencimento ajustada ao último dia
// do mês quando o dia solicitado excede o total de dias (ex: dia 31 em fevereiro).
func calcularDataVencimento(ano, mes, diaVencimento int) time.Time {
	// Primeiro dia do mês seguinte menos 1 dia = último dia do mês
	primeiroDiaProxMes := time.Date(ano, time.Month(mes)+1, 1, 0, 0, 0, 0, time.UTC)
	ultimoDia := primeiroDiaProxMes.AddDate(0, 0, -1).Day()

	dia := diaVencimento
	if dia > ultimoDia {
		dia = ultimoDia
	}
	return time.Date(ano, time.Month(mes), dia, 0, 0, 0, 0, time.UTC)
}

// ResumoFinanceiro agrega totais de mensalidades para relatório.
type ResumoFinanceiro struct {
	TotalPendente decimal.Decimal
	TotalVencido  decimal.Decimal
	TotalPago     decimal.Decimal
}

// CalcularResumo agrega os valores de uma lista de mensalidades.
func CalcularResumo(mensalidades []*Mensalidade) ResumoFinanceiro {
	var resumo ResumoFinanceiro
	for _, m := range mensalidades {
		switch m.Status {
		case MensalidadePendente:
			resumo.TotalPendente = resumo.TotalPendente.Add(m.Valor)
		case MensalidadeVencido:
			resumo.TotalVencido = resumo.TotalVencido.Add(m.Valor)
		case MensalidadePago:
			if m.ValorPago != nil {
				resumo.TotalPago = resumo.TotalPago.Add(*m.ValorPago)
			}
		}
	}
	return resumo
}
