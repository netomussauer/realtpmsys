// Package relatorio contém os casos de uso de relatórios consolidados.
// Relatórios são read-only views — não há agregado de domínio próprio.
package relatorio

import (
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"
)

// ─────────────────────────────────────────────────────────────────────────────
// INADIMPLENCIA
// ─────────────────────────────────────────────────────────────────────────────

// ItemInadimplencia é uma linha do relatório de inadimplência.
type ItemInadimplencia struct {
	MensalidadeID  uuid.UUID
	AtletaID       uuid.UUID
	AtletaNome     string
	AtletaTelefone *string
	AtletaEmail    *string
	CompetenciaAno int
	CompetenciaMes int
	DataVencimento time.Time
	Valor          decimal.Decimal
	Status         string
	DiasEmAtraso   int
}

// ResumoInadimplencia agrega totalizadores.
type ResumoInadimplencia struct {
	TotalMensalidades int64
	TotalAtletas      int64
	TotalDevido       decimal.Decimal
}

// RelatorioInadimplencia é o output completo do endpoint.
type RelatorioInadimplencia struct {
	Itens  []ItemInadimplencia
	Resumo ResumoInadimplencia
}

// ─────────────────────────────────────────────────────────────────────────────
// FREQUENCIA POR ATLETA
// ─────────────────────────────────────────────────────────────────────────────

// FrequenciaAtleta agrega presenças de um atleta no período.
type FrequenciaAtleta struct {
	Presentes      int64
	Ausentes       int64
	Justificados   int64
	Total          int64
	TaxaPresencaPC float64 // 0..100
}

// ─────────────────────────────────────────────────────────────────────────────
// FREQUENCIA POR TURMA
// ─────────────────────────────────────────────────────────────────────────────

// ItemFrequenciaTurma é uma linha do relatório de frequência consolidada por turma.
type ItemFrequenciaTurma struct {
	AtletaID       uuid.UUID
	AtletaNome     string
	Presentes      int64
	Ausentes       int64
	Justificados   int64
	Total          int64
	TaxaPresencaPC float64 // 0..100
}

// RelatorioFrequenciaTurma agrega o relatório por turma.
type RelatorioFrequenciaTurma struct {
	TurmaID       uuid.UUID
	TotalTreinos  int64
	Itens         []ItemFrequenciaTurma
}
