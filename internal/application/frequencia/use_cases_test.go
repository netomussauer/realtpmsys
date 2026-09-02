package frequencia

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	domfreq "github.com/realtpmsys/realtpmsys/internal/domain/frequencia"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	domturma "github.com/realtpmsys/realtpmsys/internal/domain/turma"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeTreinoRepo é um stub do frequencia.TreinoRepository com respostas configuráveis.
type fakeTreinoRepo struct {
	byID         *domfreq.Treino
	errByID      error
	byTurmaData  *domfreq.Treino
	errTurmaData error
	errSave      error

	savedT *domfreq.Treino
}

func (f *fakeTreinoRepo) GetByID(_ context.Context, _ uuid.UUID) (*domfreq.Treino, error) {
	return f.byID, f.errByID
}

func (f *fakeTreinoRepo) GetByTurmaData(_ context.Context, _ uuid.UUID, _ time.Time) (*domfreq.Treino, error) {
	return f.byTurmaData, f.errTurmaData
}

func (f *fakeTreinoRepo) ListPorTurma(_ context.Context, _ uuid.UUID, _ domfreq.TreinoListFilter) ([]*domfreq.Treino, int64, error) {
	return nil, 0, nil
}

func (f *fakeTreinoRepo) Save(_ context.Context, t *domfreq.Treino) error {
	f.savedT = t
	return f.errSave
}

// fakeFrequenciaRepo é um stub do frequencia.FrequenciaRepository com respostas configuráveis.
type fakeFrequenciaRepo struct {
	errSaveBatch error

	savedTreinoID uuid.UUID
	savedFreqs    []*domfreq.Frequencia
}

func (f *fakeFrequenciaRepo) ListPorTreino(_ context.Context, _ uuid.UUID) ([]*domfreq.Frequencia, error) {
	return nil, nil
}

func (f *fakeFrequenciaRepo) SaveBatch(_ context.Context, treinoID uuid.UUID, freqs []*domfreq.Frequencia) error {
	f.savedTreinoID = treinoID
	f.savedFreqs = freqs
	return f.errSaveBatch
}

// fakeTurmaRepo é um stub mínimo do turma.TurmaRepository (usado só por CriarTreinoUseCase).
type fakeTurmaRepo struct {
	byID    *domturma.Turma
	errByID error
}

func (f *fakeTurmaRepo) GetByID(_ context.Context, _ uuid.UUID) (*domturma.Turma, error) {
	return f.byID, f.errByID
}

func (f *fakeTurmaRepo) List(_ context.Context, _ domturma.TurmaListFilter) ([]*domturma.Turma, int64, error) {
	return nil, 0, nil
}

func (f *fakeTurmaRepo) Save(_ context.Context, _ *domturma.Turma) error {
	return nil
}

func (f *fakeTurmaRepo) SoftDelete(_ context.Context, _ uuid.UUID) error {
	return nil
}

func strPtr(s string) *string { return &s }

func turmaAtiva() *domturma.Turma {
	return &domturma.Turma{ID: uuid.New(), Nome: "Sub-11", Status: domturma.StatusAtiva}
}

// ─────────────────────────────────────────────────────────────────────────────
// CriarTreinoUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestCriarTreinoUseCase_Execute_ComHorario(t *testing.T) {
	turmaX := turmaAtiva()
	turmas := &fakeTurmaRepo{byID: turmaX}
	treinos := &fakeTreinoRepo{}
	uc := NewCriarTreinoUseCase(treinos, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{
		TurmaID: turmaX.ID, DataTreino: time.Now(), HoraInicio: "18:00", HoraFim: "19:00", Observacao: strPtr("treino tático"),
	})

	require.NoError(t, err)
	require.NotNil(t, tr)
	assert.Equal(t, turmaX.ID, tr.TurmaID)
	assert.Equal(t, "18:00", tr.HoraInicio)
	assert.Equal(t, "19:00", tr.HoraFim)
	assert.Equal(t, "treino tático", *tr.Observacao)
	assert.Same(t, tr, treinos.savedT)
}

func TestCriarTreinoUseCase_Execute_SemHorario(t *testing.T) {
	turmaX := turmaAtiva()
	turmas := &fakeTurmaRepo{byID: turmaX}
	treinos := &fakeTreinoRepo{}
	uc := NewCriarTreinoUseCase(treinos, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{TurmaID: turmaX.ID, DataTreino: time.Now()})

	require.NoError(t, err)
	assert.Empty(t, tr.HoraInicio)
	assert.Empty(t, tr.HoraFim)
}

func TestCriarTreinoUseCase_Execute_TurmaNaoEncontrada(t *testing.T) {
	turmas := &fakeTurmaRepo{byID: nil}
	uc := NewCriarTreinoUseCase(&fakeTreinoRepo{}, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{TurmaID: uuid.New(), DataTreino: time.Now()})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestCriarTreinoUseCase_Execute_ErroAoBuscarTurma(t *testing.T) {
	buscarErr := errors.New("timeout")
	turmas := &fakeTurmaRepo{errByID: buscarErr}
	uc := NewCriarTreinoUseCase(&fakeTreinoRepo{}, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{TurmaID: uuid.New(), DataTreino: time.Now()})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestCriarTreinoUseCase_Execute_TurmaNaoAtiva(t *testing.T) {
	turmaX := turmaAtiva()
	turmaX.Status = domturma.StatusSuspensa
	turmas := &fakeTurmaRepo{byID: turmaX}
	uc := NewCriarTreinoUseCase(&fakeTreinoRepo{}, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{TurmaID: turmaX.ID, DataTreino: time.Now()})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrTurmaNaoAtiva)
}

func TestCriarTreinoUseCase_Execute_ErroAoVerificarTreinoExistente(t *testing.T) {
	turmaX := turmaAtiva()
	turmas := &fakeTurmaRepo{byID: turmaX}
	verificarErr := errors.New("db indisponível")
	treinos := &fakeTreinoRepo{errTurmaData: verificarErr}
	uc := NewCriarTreinoUseCase(treinos, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{TurmaID: turmaX.ID, DataTreino: time.Now()})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, verificarErr)
}

func TestCriarTreinoUseCase_Execute_TreinoJaExiste(t *testing.T) {
	turmaX := turmaAtiva()
	turmas := &fakeTurmaRepo{byID: turmaX}
	treinos := &fakeTreinoRepo{byTurmaData: &domfreq.Treino{ID: uuid.New()}}
	uc := NewCriarTreinoUseCase(treinos, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{TurmaID: turmaX.ID, DataTreino: time.Now()})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrConflict)
}

func TestCriarTreinoUseCase_Execute_DataTreinoZero(t *testing.T) {
	turmaX := turmaAtiva()
	turmas := &fakeTurmaRepo{byID: turmaX}
	uc := NewCriarTreinoUseCase(&fakeTreinoRepo{}, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{TurmaID: turmaX.ID})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestCriarTreinoUseCase_Execute_HorarioParcial(t *testing.T) {
	turmaX := turmaAtiva()
	turmas := &fakeTurmaRepo{byID: turmaX}
	uc := NewCriarTreinoUseCase(&fakeTreinoRepo{}, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{TurmaID: turmaX.ID, DataTreino: time.Now(), HoraInicio: "18:00"})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestCriarTreinoUseCase_Execute_HorarioFimAntesDoInicio(t *testing.T) {
	turmaX := turmaAtiva()
	turmas := &fakeTurmaRepo{byID: turmaX}
	uc := NewCriarTreinoUseCase(&fakeTreinoRepo{}, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{
		TurmaID: turmaX.ID, DataTreino: time.Now(), HoraInicio: "19:00", HoraFim: "18:00",
	})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestCriarTreinoUseCase_Execute_ErroAoSalvar(t *testing.T) {
	turmaX := turmaAtiva()
	turmas := &fakeTurmaRepo{byID: turmaX}
	saveErr := errors.New("conflito de escrita")
	treinos := &fakeTreinoRepo{errSave: saveErr}
	uc := NewCriarTreinoUseCase(treinos, turmas)

	tr, err := uc.Execute(context.Background(), CriarTreinoInput{TurmaID: turmaX.ID, DataTreino: time.Now()})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// LancarFrequenciaUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestLancarFrequenciaUseCase_Execute_Sucesso(t *testing.T) {
	treinoX := &domfreq.Treino{ID: uuid.New()}
	treinos := &fakeTreinoRepo{byID: treinoX}
	frequencias := &fakeFrequenciaRepo{}
	uc := NewLancarFrequenciaUseCase(treinos, frequencias)

	result, err := uc.Execute(context.Background(), LancarFrequenciaInput{
		TreinoID: treinoX.ID,
		Registros: []PresencaInput{
			{AtletaID: uuid.New(), Presenca: domfreq.PresencaPresente},
			{AtletaID: uuid.New(), Presenca: domfreq.PresencaAusente},
			{AtletaID: uuid.New(), Presenca: domfreq.PresencaJustificado, Justificativa: strPtr("atestado médico")},
		},
	})

	require.NoError(t, err)
	assert.Equal(t, 3, result.Total)
	assert.Equal(t, treinoX.ID, frequencias.savedTreinoID)
	require.Len(t, frequencias.savedFreqs, 3)
	assert.Equal(t, domfreq.PresencaPresente, frequencias.savedFreqs[0].Presenca)
}

func TestLancarFrequenciaUseCase_Execute_ListaVazia(t *testing.T) {
	uc := NewLancarFrequenciaUseCase(&fakeTreinoRepo{}, &fakeFrequenciaRepo{})

	result, err := uc.Execute(context.Background(), LancarFrequenciaInput{TreinoID: uuid.New(), Registros: nil})

	assert.Equal(t, LancarFrequenciaResult{}, result)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestLancarFrequenciaUseCase_Execute_TreinoNaoEncontrado(t *testing.T) {
	treinos := &fakeTreinoRepo{byID: nil}
	uc := NewLancarFrequenciaUseCase(treinos, &fakeFrequenciaRepo{})

	result, err := uc.Execute(context.Background(), LancarFrequenciaInput{
		TreinoID: uuid.New(), Registros: []PresencaInput{{AtletaID: uuid.New(), Presenca: domfreq.PresencaPresente}},
	})

	assert.Equal(t, LancarFrequenciaResult{}, result)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestLancarFrequenciaUseCase_Execute_ErroAoBuscarTreino(t *testing.T) {
	buscarErr := errors.New("timeout")
	treinos := &fakeTreinoRepo{errByID: buscarErr}
	uc := NewLancarFrequenciaUseCase(treinos, &fakeFrequenciaRepo{})

	result, err := uc.Execute(context.Background(), LancarFrequenciaInput{
		TreinoID: uuid.New(), Registros: []PresencaInput{{AtletaID: uuid.New(), Presenca: domfreq.PresencaPresente}},
	})

	assert.Equal(t, LancarFrequenciaResult{}, result)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestLancarFrequenciaUseCase_Execute_PresencaInvalida(t *testing.T) {
	treinoX := &domfreq.Treino{ID: uuid.New()}
	treinos := &fakeTreinoRepo{byID: treinoX}
	frequencias := &fakeFrequenciaRepo{}
	uc := NewLancarFrequenciaUseCase(treinos, frequencias)

	result, err := uc.Execute(context.Background(), LancarFrequenciaInput{
		TreinoID: treinoX.ID, Registros: []PresencaInput{{AtletaID: uuid.New(), Presenca: domfreq.Presenca("ATRASADO")}},
	})

	assert.Equal(t, LancarFrequenciaResult{}, result)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
	assert.Nil(t, frequencias.savedFreqs, "não deve chamar SaveBatch quando um registro do lote é inválido")
}

func TestLancarFrequenciaUseCase_Execute_JustificadoSemJustificativa(t *testing.T) {
	treinoX := &domfreq.Treino{ID: uuid.New()}
	treinos := &fakeTreinoRepo{byID: treinoX}
	uc := NewLancarFrequenciaUseCase(treinos, &fakeFrequenciaRepo{})

	result, err := uc.Execute(context.Background(), LancarFrequenciaInput{
		TreinoID: treinoX.ID, Registros: []PresencaInput{{AtletaID: uuid.New(), Presenca: domfreq.PresencaJustificado}},
	})

	assert.Equal(t, LancarFrequenciaResult{}, result)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestLancarFrequenciaUseCase_Execute_ErroAoSalvarLote(t *testing.T) {
	treinoX := &domfreq.Treino{ID: uuid.New()}
	treinos := &fakeTreinoRepo{byID: treinoX}
	saveErr := errors.New("conflito de escrita")
	frequencias := &fakeFrequenciaRepo{errSaveBatch: saveErr}
	uc := NewLancarFrequenciaUseCase(treinos, frequencias)

	result, err := uc.Execute(context.Background(), LancarFrequenciaInput{
		TreinoID: treinoX.ID, Registros: []PresencaInput{{AtletaID: uuid.New(), Presenca: domfreq.PresencaPresente}},
	})

	assert.Equal(t, LancarFrequenciaResult{}, result)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}
