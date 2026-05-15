// Package turma contém os casos de uso do contexto Turmas.
package turma

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	domainatleta "github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	domainturma "github.com/realtpmsys/realtpmsys/internal/domain/turma"
)

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR TURMA
// ─────────────────────────────────────────────────────────────────────────────

type HorarioInput struct {
	DiaSemana  domainturma.DiaSemana
	HoraInicio string // HH:MM
	HoraFim    string // HH:MM
}

type CriarTurmaInput struct {
	Nome           string
	FaixaEtariaMin int
	FaixaEtariaMax int
	CapacidadeMax  int
	TreinadorID    *uuid.UUID
	CampoID        *uuid.UUID
	Horarios       []HorarioInput
}

type CriarTurmaUseCase struct {
	turmas domainturma.TurmaRepository
}

func NewCriarTurmaUseCase(turmas domainturma.TurmaRepository) *CriarTurmaUseCase {
	return &CriarTurmaUseCase{turmas: turmas}
}

func (uc *CriarTurmaUseCase) Execute(ctx context.Context, in CriarTurmaInput) (*domainturma.Turma, error) {
	t, err := domainturma.NewTurma(in.Nome, in.FaixaEtariaMin, in.FaixaEtariaMax, in.CapacidadeMax)
	if err != nil {
		return nil, err
	}
	t.TreinadorID = in.TreinadorID
	t.CampoID = in.CampoID
	t.Horarios = make([]domainturma.HorarioTurma, len(in.Horarios))
	for i, h := range in.Horarios {
		t.Horarios[i] = domainturma.HorarioTurma{
			ID:         uuid.New(),
			TurmaID:    t.ID,
			DiaSemana:  h.DiaSemana,
			HoraInicio: h.HoraInicio,
			HoraFim:    h.HoraFim,
		}
	}
	if err := uc.turmas.Save(ctx, t); err != nil {
		return nil, fmt.Errorf("salvar turma: %w", err)
	}
	return t, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// ATUALIZAR TURMA
// ─────────────────────────────────────────────────────────────────────────────

type AtualizarTurmaInput struct {
	ID             uuid.UUID
	Nome           string
	FaixaEtariaMin int
	FaixaEtariaMax int
	CapacidadeMax  int
	TreinadorID    *uuid.UUID
	CampoID        *uuid.UUID
	Horarios       []HorarioInput
}

type AtualizarTurmaUseCase struct {
	turmas domainturma.TurmaRepository
}

func NewAtualizarTurmaUseCase(turmas domainturma.TurmaRepository) *AtualizarTurmaUseCase {
	return &AtualizarTurmaUseCase{turmas: turmas}
}

func (uc *AtualizarTurmaUseCase) Execute(ctx context.Context, in AtualizarTurmaInput) (*domainturma.Turma, error) {
	t, err := uc.turmas.GetByID(ctx, in.ID)
	if err != nil {
		return nil, fmt.Errorf("buscar turma: %w", err)
	}
	if t == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("turma %s não encontrada", in.ID))
	}

	if in.FaixaEtariaMin < 4 || in.FaixaEtariaMax > 18 || in.FaixaEtariaMin > in.FaixaEtariaMax {
		return nil, shared.ErrFaixaEtariaInvalida
	}
	if in.CapacidadeMax <= 0 {
		return nil, shared.Newf(shared.ErrDomainViolation, "capacidade_max deve ser positiva")
	}

	t.Nome = in.Nome
	t.FaixaEtariaMin = in.FaixaEtariaMin
	t.FaixaEtariaMax = in.FaixaEtariaMax
	t.CapacidadeMax = in.CapacidadeMax
	t.TreinadorID = in.TreinadorID
	t.CampoID = in.CampoID
	t.Horarios = make([]domainturma.HorarioTurma, len(in.Horarios))
	for i, h := range in.Horarios {
		t.Horarios[i] = domainturma.HorarioTurma{
			ID:         uuid.New(),
			TurmaID:    t.ID,
			DiaSemana:  h.DiaSemana,
			HoraInicio: h.HoraInicio,
			HoraFim:    h.HoraFim,
		}
	}
	t.AtualizadoEm = time.Now().UTC()

	if err := uc.turmas.Save(ctx, t); err != nil {
		return nil, fmt.Errorf("salvar turma: %w", err)
	}
	return t, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// MUDAR STATUS DA TURMA
// ─────────────────────────────────────────────────────────────────────────────

type AcaoStatusTurma string

const (
	AcaoEncerrar  AcaoStatusTurma = "ENCERRAR"
	AcaoSuspender AcaoStatusTurma = "SUSPENDER"
	AcaoReativar  AcaoStatusTurma = "REATIVAR"
)

type MudarStatusTurmaUseCase struct {
	turmas domainturma.TurmaRepository
}

func NewMudarStatusTurmaUseCase(turmas domainturma.TurmaRepository) *MudarStatusTurmaUseCase {
	return &MudarStatusTurmaUseCase{turmas: turmas}
}

func (uc *MudarStatusTurmaUseCase) Execute(ctx context.Context, id uuid.UUID, acao AcaoStatusTurma) (*domainturma.Turma, error) {
	t, err := uc.turmas.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscar turma: %w", err)
	}
	if t == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("turma %s não encontrada", id))
	}

	switch acao {
	case AcaoEncerrar:
		if err := t.Encerrar(); err != nil {
			return nil, err
		}
	case AcaoSuspender:
		if err := t.Suspender(); err != nil {
			return nil, err
		}
	case AcaoReativar:
		if err := t.Reativar(); err != nil {
			return nil, err
		}
	default:
		return nil, shared.Newf(shared.ErrDomainViolation, fmt.Sprintf("ação inválida: %s", acao))
	}

	if err := uc.turmas.Save(ctx, t); err != nil {
		return nil, fmt.Errorf("salvar turma: %w", err)
	}
	return t, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// MATRICULAR ATLETA
// ─────────────────────────────────────────────────────────────────────────────

type MatricularAtletaInput struct {
	AtletaID   uuid.UUID
	TurmaID    uuid.UUID
	DataInicio time.Time
}

type MatricularAtletaUseCase struct {
	turmas      domainturma.TurmaRepository
	matriculas  domainturma.MatriculaRepository
	atletas     domainatleta.Repository
}

func NewMatricularAtletaUseCase(
	turmas domainturma.TurmaRepository,
	matriculas domainturma.MatriculaRepository,
	atletas domainatleta.Repository,
) *MatricularAtletaUseCase {
	return &MatricularAtletaUseCase{turmas: turmas, matriculas: matriculas, atletas: atletas}
}

func (uc *MatricularAtletaUseCase) Execute(ctx context.Context, in MatricularAtletaInput) (*domainturma.Matricula, error) {
	t, err := uc.turmas.GetByID(ctx, in.TurmaID)
	if err != nil {
		return nil, fmt.Errorf("buscar turma: %w", err)
	}
	if t == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("turma %s não encontrada", in.TurmaID))
	}
	if t.Status != domainturma.StatusAtiva {
		return nil, shared.ErrTurmaNaoAtiva
	}

	a, err := uc.atletas.GetByID(ctx, in.AtletaID)
	if err != nil {
		return nil, fmt.Errorf("buscar atleta: %w", err)
	}
	if a == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("atleta %s não encontrado", in.AtletaID))
	}
	if !t.AceitaIdade(a.Idade()) {
		return nil, shared.Newf(shared.ErrIdadeForaDaFaixa,
			fmt.Sprintf("atleta tem %d anos, turma aceita %d–%d", a.Idade(), t.FaixaEtariaMin, t.FaixaEtariaMax))
	}

	existente, err := uc.matriculas.GetAtivaByAtletaTurma(ctx, in.AtletaID, in.TurmaID)
	if err != nil {
		return nil, fmt.Errorf("verificar matrícula existente: %w", err)
	}
	if existente != nil {
		return nil, shared.ErrAtletaJaMatriculado
	}

	ativas, err := uc.matriculas.CountAtivasPorTurma(ctx, in.TurmaID)
	if err != nil {
		return nil, fmt.Errorf("contar matrículas ativas: %w", err)
	}
	if ativas >= int64(t.CapacidadeMax) {
		return nil, shared.ErrTurmaSemVagas
	}

	m, err := domainturma.NewMatricula(in.AtletaID, in.TurmaID, in.DataInicio)
	if err != nil {
		return nil, err
	}
	if err := uc.matriculas.Save(ctx, m); err != nil {
		return nil, fmt.Errorf("salvar matrícula: %w", err)
	}
	return m, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// CANCELAR MATRÍCULA
// ─────────────────────────────────────────────────────────────────────────────

type CancelarMatriculaUseCase struct {
	matriculas domainturma.MatriculaRepository
}

func NewCancelarMatriculaUseCase(matriculas domainturma.MatriculaRepository) *CancelarMatriculaUseCase {
	return &CancelarMatriculaUseCase{matriculas: matriculas}
}

func (uc *CancelarMatriculaUseCase) Execute(ctx context.Context, id uuid.UUID) (*domainturma.Matricula, error) {
	m, err := uc.matriculas.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscar matrícula: %w", err)
	}
	if m == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("matrícula %s não encontrada", id))
	}
	if err := m.Cancelar(); err != nil {
		return nil, err
	}
	if err := uc.matriculas.Save(ctx, m); err != nil {
		return nil, fmt.Errorf("salvar matrícula: %w", err)
	}
	return m, nil
}
