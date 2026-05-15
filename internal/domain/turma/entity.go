// Package turma contém as entidades do contexto Turmas.
package turma

import (
	"time"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
)

// ─────────────────────────────────────────────────────────────────────────────
// TURMA
// ─────────────────────────────────────────────────────────────────────────────

// Status representa o ciclo de vida da turma.
type Status string

const (
	StatusAtiva     Status = "ATIVA"
	StatusEncerrada Status = "ENCERRADA"
	StatusSuspensa  Status = "SUSPENSA"
)

// DiaSemana enumera os dias válidos para os horários de uma turma.
type DiaSemana string

const (
	DiaSEG DiaSemana = "SEG"
	DiaTER DiaSemana = "TER"
	DiaQUA DiaSemana = "QUA"
	DiaQUI DiaSemana = "QUI"
	DiaSEX DiaSemana = "SEX"
	DiaSAB DiaSemana = "SAB"
	DiaDOM DiaSemana = "DOM"
)

// Turma é o Aggregate Root do contexto.
type Turma struct {
	ID             uuid.UUID
	Nome           string
	FaixaEtariaMin int
	FaixaEtariaMax int
	CapacidadeMax  int
	TreinadorID    *uuid.UUID
	CampoID        *uuid.UUID
	Status         Status
	Horarios       []HorarioTurma
	CriadoEm       time.Time
	AtualizadoEm   time.Time
	DeletadoEm     *time.Time
}

// HorarioTurma representa uma janela recorrente de treino na semana.
type HorarioTurma struct {
	ID         uuid.UUID
	TurmaID    uuid.UUID
	DiaSemana  DiaSemana
	HoraInicio string // HH:MM
	HoraFim    string // HH:MM
}

// NewTurma cria uma turma validada.
func NewTurma(nome string, faixaMin, faixaMax, capacidade int) (*Turma, error) {
	if nome == "" {
		return nil, shared.Newf(shared.ErrDomainViolation, "nome da turma é obrigatório")
	}
	if faixaMin < 4 || faixaMax > 18 || faixaMin > faixaMax {
		return nil, shared.ErrFaixaEtariaInvalida
	}
	if capacidade <= 0 {
		return nil, shared.Newf(shared.ErrDomainViolation, "capacidade_max deve ser positiva")
	}
	now := time.Now().UTC()
	return &Turma{
		ID:             uuid.New(),
		Nome:           nome,
		FaixaEtariaMin: faixaMin,
		FaixaEtariaMax: faixaMax,
		CapacidadeMax:  capacidade,
		Status:         StatusAtiva,
		CriadoEm:       now,
		AtualizadoEm:   now,
	}, nil
}

// Encerrar marca a turma como encerrada.
func (t *Turma) Encerrar() error {
	if t.Status == StatusEncerrada {
		return shared.Newf(shared.ErrDomainViolation, "turma já está encerrada")
	}
	t.Status = StatusEncerrada
	t.AtualizadoEm = time.Now().UTC()
	return nil
}

// Suspender marca a turma como suspensa (pausa temporária).
func (t *Turma) Suspender() error {
	if t.Status != StatusAtiva {
		return shared.Newf(shared.ErrDomainViolation, "apenas turmas ATIVAS podem ser suspensas")
	}
	t.Status = StatusSuspensa
	t.AtualizadoEm = time.Now().UTC()
	return nil
}

// Reativar volta a turma para ATIVA. Só faz sentido vindo de SUSPENSA.
func (t *Turma) Reativar() error {
	if t.Status != StatusSuspensa {
		return shared.Newf(shared.ErrDomainViolation, "apenas turmas SUSPENSAS podem ser reativadas")
	}
	t.Status = StatusAtiva
	t.AtualizadoEm = time.Now().UTC()
	return nil
}

// AceitaIdade retorna true se a idade está dentro da faixa configurada.
func (t *Turma) AceitaIdade(idade int) bool {
	return idade >= t.FaixaEtariaMin && idade <= t.FaixaEtariaMax
}

// ─────────────────────────────────────────────────────────────────────────────
// MATRICULA
// ─────────────────────────────────────────────────────────────────────────────

// StatusMatricula representa o ciclo de vida da matrícula.
type StatusMatricula string

const (
	MatriculaAtiva        StatusMatricula = "ATIVA"
	MatriculaCancelada    StatusMatricula = "CANCELADA"
	MatriculaTransferida  StatusMatricula = "TRANSFERIDA"
)

// Matricula vincula um atleta a uma turma em um período.
type Matricula struct {
	ID           uuid.UUID
	AtletaID     uuid.UUID
	TurmaID      uuid.UUID
	DataInicio   time.Time
	DataFim      *time.Time
	Status       StatusMatricula
	CriadoEm     time.Time
	AtualizadoEm time.Time
}

// NewMatricula cria uma matrícula validada.
func NewMatricula(atletaID, turmaID uuid.UUID, dataInicio time.Time) (*Matricula, error) {
	if dataInicio.IsZero() {
		return nil, shared.Newf(shared.ErrDomainViolation, "data_inicio é obrigatória")
	}
	now := time.Now().UTC()
	return &Matricula{
		ID:           uuid.New(),
		AtletaID:     atletaID,
		TurmaID:      turmaID,
		DataInicio:   dataInicio,
		Status:       MatriculaAtiva,
		CriadoEm:     now,
		AtualizadoEm: now,
	}, nil
}

// Cancelar encerra a matrícula com a data atual.
func (m *Matricula) Cancelar() error {
	if m.Status != MatriculaAtiva {
		return shared.Newf(shared.ErrDomainViolation, "apenas matrículas ATIVAS podem ser canceladas")
	}
	now := time.Now().UTC()
	m.Status = MatriculaCancelada
	m.DataFim = &now
	m.AtualizadoEm = now
	return nil
}
