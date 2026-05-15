// Package frequencia contém os casos de uso do contexto Frequência.
package frequencia

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	domfreq "github.com/realtpmsys/realtpmsys/internal/domain/frequencia"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	domturma "github.com/realtpmsys/realtpmsys/internal/domain/turma"
)

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR TREINO
// ─────────────────────────────────────────────────────────────────────────────

type CriarTreinoInput struct {
	TurmaID    uuid.UUID
	DataTreino time.Time
	HoraInicio string // HH:MM ("" para nulo)
	HoraFim    string // HH:MM ("" para nulo)
	Observacao *string
}

type CriarTreinoUseCase struct {
	treinos domfreq.TreinoRepository
	turmas  domturma.TurmaRepository
}

func NewCriarTreinoUseCase(treinos domfreq.TreinoRepository, turmas domturma.TurmaRepository) *CriarTreinoUseCase {
	return &CriarTreinoUseCase{treinos: treinos, turmas: turmas}
}

func (uc *CriarTreinoUseCase) Execute(ctx context.Context, in CriarTreinoInput) (*domfreq.Treino, error) {
	t, err := uc.turmas.GetByID(ctx, in.TurmaID)
	if err != nil {
		return nil, fmt.Errorf("buscar turma: %w", err)
	}
	if t == nil {
		return nil, shared.Newf(shared.ErrNotFound, fmt.Sprintf("turma %s não encontrada", in.TurmaID))
	}
	if t.Status != domturma.StatusAtiva {
		return nil, shared.ErrTurmaNaoAtiva
	}

	existente, err := uc.treinos.GetByTurmaData(ctx, in.TurmaID, in.DataTreino)
	if err != nil {
		return nil, fmt.Errorf("verificar treino existente: %w", err)
	}
	if existente != nil {
		return nil, shared.Newf(shared.ErrConflict,
			fmt.Sprintf("já existe treino para a turma %s na data %s", in.TurmaID, in.DataTreino.Format("2006-01-02")))
	}

	treino, err := domfreq.NewTreino(in.TurmaID, in.DataTreino)
	if err != nil {
		return nil, err
	}
	if err := treino.SetHorario(in.HoraInicio, in.HoraFim); err != nil {
		return nil, err
	}
	treino.Observacao = in.Observacao

	if err := uc.treinos.Save(ctx, treino); err != nil {
		return nil, fmt.Errorf("salvar treino: %w", err)
	}
	return treino, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// LANCAR FREQUENCIA (lote idempotente)
// ─────────────────────────────────────────────────────────────────────────────

// PresencaInput representa uma marcação de presença individual no lote.
type PresencaInput struct {
	AtletaID      uuid.UUID
	Presenca      domfreq.Presenca
	Justificativa *string
}

type LancarFrequenciaInput struct {
	TreinoID  uuid.UUID
	Registros []PresencaInput
}

type LancarFrequenciaResult struct {
	Total int
}

type LancarFrequenciaUseCase struct {
	treinos     domfreq.TreinoRepository
	frequencias domfreq.FrequenciaRepository
}

func NewLancarFrequenciaUseCase(treinos domfreq.TreinoRepository, frequencias domfreq.FrequenciaRepository) *LancarFrequenciaUseCase {
	return &LancarFrequenciaUseCase{treinos: treinos, frequencias: frequencias}
}

func (uc *LancarFrequenciaUseCase) Execute(ctx context.Context, in LancarFrequenciaInput) (LancarFrequenciaResult, error) {
	if len(in.Registros) == 0 {
		return LancarFrequenciaResult{}, shared.Newf(shared.ErrDomainViolation, "lista de presenças vazia")
	}
	treino, err := uc.treinos.GetByID(ctx, in.TreinoID)
	if err != nil {
		return LancarFrequenciaResult{}, fmt.Errorf("buscar treino: %w", err)
	}
	if treino == nil {
		return LancarFrequenciaResult{}, shared.Newf(shared.ErrNotFound, fmt.Sprintf("treino %s não encontrado", in.TreinoID))
	}

	freqs := make([]*domfreq.Frequencia, len(in.Registros))
	for i, reg := range in.Registros {
		f, err := domfreq.NewFrequencia(in.TreinoID, reg.AtletaID, reg.Presenca, reg.Justificativa)
		if err != nil {
			return LancarFrequenciaResult{}, err
		}
		freqs[i] = f
	}

	if err := uc.frequencias.SaveBatch(ctx, in.TreinoID, freqs); err != nil {
		return LancarFrequenciaResult{}, fmt.Errorf("salvar frequências: %w", err)
	}
	return LancarFrequenciaResult{Total: len(freqs)}, nil
}
