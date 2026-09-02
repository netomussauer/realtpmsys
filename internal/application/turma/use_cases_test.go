package turma

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	domainatleta "github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	domainturma "github.com/realtpmsys/realtpmsys/internal/domain/turma"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeTurmaRepo é um stub do turma.TurmaRepository com respostas configuráveis.
type fakeTurmaRepo struct {
	byID    *domainturma.Turma
	errByID error
	errSave error

	savedT *domainturma.Turma
}

func (f *fakeTurmaRepo) GetByID(_ context.Context, _ uuid.UUID) (*domainturma.Turma, error) {
	return f.byID, f.errByID
}

func (f *fakeTurmaRepo) List(_ context.Context, _ domainturma.TurmaListFilter) ([]*domainturma.Turma, int64, error) {
	return nil, 0, nil
}

func (f *fakeTurmaRepo) Save(_ context.Context, t *domainturma.Turma) error {
	f.savedT = t
	return f.errSave
}

func (f *fakeTurmaRepo) SoftDelete(_ context.Context, _ uuid.UUID) error {
	return nil
}

// fakeMatriculaRepo é um stub do turma.MatriculaRepository com respostas configuráveis.
type fakeMatriculaRepo struct {
	byID           *domainturma.Matricula
	errByID        error
	ativaExistente *domainturma.Matricula
	errAtiva       error
	countAtivas    int64
	errCount       error
	errSave        error

	savedM *domainturma.Matricula
}

func (f *fakeMatriculaRepo) GetByID(_ context.Context, _ uuid.UUID) (*domainturma.Matricula, error) {
	return f.byID, f.errByID
}

func (f *fakeMatriculaRepo) GetAtivaByAtletaTurma(_ context.Context, _, _ uuid.UUID) (*domainturma.Matricula, error) {
	return f.ativaExistente, f.errAtiva
}

func (f *fakeMatriculaRepo) ListPorTurma(_ context.Context, _ uuid.UUID, _ domainturma.MatriculaListFilter) ([]*domainturma.Matricula, int64, error) {
	return nil, 0, nil
}

func (f *fakeMatriculaRepo) CountAtivasPorTurma(_ context.Context, _ uuid.UUID) (int64, error) {
	return f.countAtivas, f.errCount
}

func (f *fakeMatriculaRepo) Save(_ context.Context, m *domainturma.Matricula) error {
	f.savedM = m
	return f.errSave
}

// fakeAtletaRepoParaTurma é um stub mínimo do atleta.Repository (usado só por MatricularAtletaUseCase).
type fakeAtletaRepoParaTurma struct {
	byID    *domainatleta.Atleta
	errByID error
}

func (f *fakeAtletaRepoParaTurma) GetByID(_ context.Context, _ uuid.UUID) (*domainatleta.Atleta, error) {
	return f.byID, f.errByID
}

func (f *fakeAtletaRepoParaTurma) GetByIDPorResponsavel(_ context.Context, _ uuid.UUID, _ uuid.UUID) (*domainatleta.Atleta, error) {
	return f.byID, f.errByID
}

func (f *fakeAtletaRepoParaTurma) IsAtletaDoResponsavel(_ context.Context, _ uuid.UUID, _ uuid.UUID) (bool, error) {
	return false, nil
}

func (f *fakeAtletaRepoParaTurma) GetByCPF(_ context.Context, _ string) (*domainatleta.Atleta, error) {
	return nil, nil
}

func (f *fakeAtletaRepoParaTurma) List(_ context.Context, _ domainatleta.ListFilter) ([]*domainatleta.Atleta, int64, error) {
	return nil, 0, nil
}

func (f *fakeAtletaRepoParaTurma) Save(_ context.Context, _ *domainatleta.Atleta) error {
	return nil
}

func (f *fakeAtletaRepoParaTurma) SoftDelete(_ context.Context, _ uuid.UUID) error {
	return nil
}

func atletaComIdade(idade int) *domainatleta.Atleta {
	nascimento := time.Now().AddDate(-idade, 0, -1) // garante idade já completa
	return &domainatleta.Atleta{ID: uuid.New(), Nome: "Atleta", DataNascimento: nascimento, Status: domainatleta.StatusAtivo}
}

// ─────────────────────────────────────────────────────────────────────────────
// CriarTurmaUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestCriarTurmaUseCase_Execute_Sucesso(t *testing.T) {
	repo := &fakeTurmaRepo{}
	uc := NewCriarTurmaUseCase(repo)
	treinadorID := uuid.New()

	tu, err := uc.Execute(context.Background(), CriarTurmaInput{
		Nome: "Sub-11", FaixaEtariaMin: 8, FaixaEtariaMax: 11, CapacidadeMax: 20,
		TreinadorID: &treinadorID,
		Horarios: []HorarioInput{
			{DiaSemana: domainturma.DiaSEG, HoraInicio: "18:00", HoraFim: "19:00"},
			{DiaSemana: domainturma.DiaQUA, HoraInicio: "18:00", HoraFim: "19:00"},
		},
	})

	require.NoError(t, err)
	require.NotNil(t, tu)
	assert.Equal(t, "Sub-11", tu.Nome)
	assert.Equal(t, domainturma.StatusAtiva, tu.Status)
	assert.Equal(t, &treinadorID, tu.TreinadorID)
	require.Len(t, tu.Horarios, 2)
	assert.Equal(t, tu.ID, tu.Horarios[0].TurmaID, "horário deve referenciar o ID da turma recém-criada")
	assert.Same(t, tu, repo.savedT)
}

func TestCriarTurmaUseCase_Execute_SemHorarios(t *testing.T) {
	repo := &fakeTurmaRepo{}
	uc := NewCriarTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), CriarTurmaInput{Nome: "Sub-11", FaixaEtariaMin: 8, FaixaEtariaMax: 11, CapacidadeMax: 20})

	require.NoError(t, err)
	assert.Empty(t, tu.Horarios)
}

func TestCriarTurmaUseCase_Execute_NomeVazio(t *testing.T) {
	repo := &fakeTurmaRepo{}
	uc := NewCriarTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), CriarTurmaInput{Nome: "", FaixaEtariaMin: 8, FaixaEtariaMax: 11, CapacidadeMax: 20})

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestCriarTurmaUseCase_Execute_FaixaEtariaInvalida(t *testing.T) {
	cases := []struct {
		nome     string
		min, max int
	}{
		{"min abaixo de 4", 3, 10},
		{"max acima de 18", 10, 19},
		{"min maior que max", 12, 10},
	}
	for _, tc := range cases {
		t.Run(tc.nome, func(t *testing.T) {
			repo := &fakeTurmaRepo{}
			uc := NewCriarTurmaUseCase(repo)

			tu, err := uc.Execute(context.Background(), CriarTurmaInput{Nome: "X", FaixaEtariaMin: tc.min, FaixaEtariaMax: tc.max, CapacidadeMax: 20})

			assert.Nil(t, tu)
			require.Error(t, err)
			assert.ErrorIs(t, err, shared.ErrFaixaEtariaInvalida)
		})
	}
}

func TestCriarTurmaUseCase_Execute_CapacidadeInvalida(t *testing.T) {
	repo := &fakeTurmaRepo{}
	uc := NewCriarTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), CriarTurmaInput{Nome: "X", FaixaEtariaMin: 8, FaixaEtariaMax: 11, CapacidadeMax: 0})

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestCriarTurmaUseCase_Execute_ErroAoSalvar(t *testing.T) {
	saveErr := errors.New("db indisponível")
	repo := &fakeTurmaRepo{errSave: saveErr}
	uc := NewCriarTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), CriarTurmaInput{Nome: "X", FaixaEtariaMin: 8, FaixaEtariaMax: 11, CapacidadeMax: 20})

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// AtualizarTurmaUseCase
// ─────────────────────────────────────────────────────────────────────────────

func novaTurmaExistente() *domainturma.Turma {
	return &domainturma.Turma{
		ID: uuid.New(), Nome: "Antiga", FaixaEtariaMin: 8, FaixaEtariaMax: 11, CapacidadeMax: 20, Status: domainturma.StatusAtiva,
	}
}

func TestAtualizarTurmaUseCase_Execute_Sucesso(t *testing.T) {
	existente := novaTurmaExistente()
	repo := &fakeTurmaRepo{byID: existente}
	uc := NewAtualizarTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), AtualizarTurmaInput{
		ID: existente.ID, Nome: "Nova", FaixaEtariaMin: 9, FaixaEtariaMax: 12, CapacidadeMax: 25,
	})

	require.NoError(t, err)
	assert.Equal(t, "Nova", tu.Nome)
	assert.Equal(t, 9, tu.FaixaEtariaMin)
	assert.Same(t, existente, repo.savedT)
}

func TestAtualizarTurmaUseCase_Execute_NaoEncontrada(t *testing.T) {
	repo := &fakeTurmaRepo{byID: nil}
	uc := NewAtualizarTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), AtualizarTurmaInput{ID: uuid.New(), FaixaEtariaMin: 8, FaixaEtariaMax: 11, CapacidadeMax: 20})

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestAtualizarTurmaUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	repo := &fakeTurmaRepo{errByID: buscarErr}
	uc := NewAtualizarTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), AtualizarTurmaInput{ID: uuid.New(), FaixaEtariaMin: 8, FaixaEtariaMax: 11, CapacidadeMax: 20})

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestAtualizarTurmaUseCase_Execute_FaixaEtariaInvalida(t *testing.T) {
	existente := novaTurmaExistente()
	repo := &fakeTurmaRepo{byID: existente}
	uc := NewAtualizarTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), AtualizarTurmaInput{ID: existente.ID, FaixaEtariaMin: 15, FaixaEtariaMax: 10, CapacidadeMax: 20})

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrFaixaEtariaInvalida)
}

func TestAtualizarTurmaUseCase_Execute_CapacidadeInvalida(t *testing.T) {
	existente := novaTurmaExistente()
	repo := &fakeTurmaRepo{byID: existente}
	uc := NewAtualizarTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), AtualizarTurmaInput{ID: existente.ID, FaixaEtariaMin: 8, FaixaEtariaMax: 11, CapacidadeMax: -5})

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestAtualizarTurmaUseCase_Execute_ErroAoSalvar(t *testing.T) {
	existente := novaTurmaExistente()
	saveErr := errors.New("conflito de escrita")
	repo := &fakeTurmaRepo{byID: existente, errSave: saveErr}
	uc := NewAtualizarTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), AtualizarTurmaInput{ID: existente.ID, FaixaEtariaMin: 8, FaixaEtariaMax: 11, CapacidadeMax: 20})

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// MudarStatusTurmaUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestMudarStatusTurmaUseCase_Execute_Encerrar(t *testing.T) {
	existente := novaTurmaExistente()
	repo := &fakeTurmaRepo{byID: existente}
	uc := NewMudarStatusTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), existente.ID, AcaoEncerrar)

	require.NoError(t, err)
	assert.Equal(t, domainturma.StatusEncerrada, tu.Status)
}

func TestMudarStatusTurmaUseCase_Execute_Suspender(t *testing.T) {
	existente := novaTurmaExistente() // ATIVA
	repo := &fakeTurmaRepo{byID: existente}
	uc := NewMudarStatusTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), existente.ID, AcaoSuspender)

	require.NoError(t, err)
	assert.Equal(t, domainturma.StatusSuspensa, tu.Status)
}

func TestMudarStatusTurmaUseCase_Execute_Reativar(t *testing.T) {
	existente := novaTurmaExistente()
	existente.Status = domainturma.StatusSuspensa
	repo := &fakeTurmaRepo{byID: existente}
	uc := NewMudarStatusTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), existente.ID, AcaoReativar)

	require.NoError(t, err)
	assert.Equal(t, domainturma.StatusAtiva, tu.Status)
}

func TestMudarStatusTurmaUseCase_Execute_EncerrarQuandoJaEncerrada(t *testing.T) {
	existente := novaTurmaExistente()
	existente.Status = domainturma.StatusEncerrada
	repo := &fakeTurmaRepo{byID: existente}
	uc := NewMudarStatusTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), existente.ID, AcaoEncerrar)

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestMudarStatusTurmaUseCase_Execute_SuspenderQuandoNaoAtiva(t *testing.T) {
	existente := novaTurmaExistente()
	existente.Status = domainturma.StatusEncerrada
	repo := &fakeTurmaRepo{byID: existente}
	uc := NewMudarStatusTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), existente.ID, AcaoSuspender)

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestMudarStatusTurmaUseCase_Execute_ReativarQuandoNaoSuspensa(t *testing.T) {
	existente := novaTurmaExistente() // ATIVA
	repo := &fakeTurmaRepo{byID: existente}
	uc := NewMudarStatusTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), existente.ID, AcaoReativar)

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestMudarStatusTurmaUseCase_Execute_NaoEncontrada(t *testing.T) {
	repo := &fakeTurmaRepo{byID: nil}
	uc := NewMudarStatusTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), uuid.New(), AcaoEncerrar)

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestMudarStatusTurmaUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	repo := &fakeTurmaRepo{errByID: buscarErr}
	uc := NewMudarStatusTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), uuid.New(), AcaoEncerrar)

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestMudarStatusTurmaUseCase_Execute_AcaoInvalida(t *testing.T) {
	existente := novaTurmaExistente()
	repo := &fakeTurmaRepo{byID: existente}
	uc := NewMudarStatusTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), existente.ID, AcaoStatusTurma("VOAR"))

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestMudarStatusTurmaUseCase_Execute_ErroAoSalvar(t *testing.T) {
	existente := novaTurmaExistente()
	saveErr := errors.New("conflito de escrita")
	repo := &fakeTurmaRepo{byID: existente, errSave: saveErr}
	uc := NewMudarStatusTurmaUseCase(repo)

	tu, err := uc.Execute(context.Background(), existente.ID, AcaoEncerrar)

	assert.Nil(t, tu)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// MatricularAtletaUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestMatricularAtletaUseCase_Execute_Sucesso(t *testing.T) {
	turmaX := novaTurmaExistente() // faixa 8-11, capacidade 20
	turmas := &fakeTurmaRepo{byID: turmaX}
	matriculas := &fakeMatriculaRepo{countAtivas: 5}
	atletas := &fakeAtletaRepoParaTurma{byID: atletaComIdade(9)}
	uc := NewMatricularAtletaUseCase(turmas, matriculas, atletas)

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{
		AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Now(),
	})

	require.NoError(t, err)
	require.NotNil(t, m)
	assert.Equal(t, domainturma.MatriculaAtiva, m.Status)
	assert.Same(t, m, matriculas.savedM)
}

func TestMatricularAtletaUseCase_Execute_TurmaNaoEncontrada(t *testing.T) {
	turmas := &fakeTurmaRepo{byID: nil}
	uc := NewMatricularAtletaUseCase(turmas, &fakeMatriculaRepo{}, &fakeAtletaRepoParaTurma{})

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: uuid.New(), DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestMatricularAtletaUseCase_Execute_ErroAoBuscarTurma(t *testing.T) {
	buscarErr := errors.New("timeout")
	turmas := &fakeTurmaRepo{errByID: buscarErr}
	uc := NewMatricularAtletaUseCase(turmas, &fakeMatriculaRepo{}, &fakeAtletaRepoParaTurma{})

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: uuid.New(), DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestMatricularAtletaUseCase_Execute_TurmaNaoAtiva(t *testing.T) {
	turmaX := novaTurmaExistente()
	turmaX.Status = domainturma.StatusSuspensa
	turmas := &fakeTurmaRepo{byID: turmaX}
	uc := NewMatricularAtletaUseCase(turmas, &fakeMatriculaRepo{}, &fakeAtletaRepoParaTurma{})

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrTurmaNaoAtiva)
}

func TestMatricularAtletaUseCase_Execute_AtletaNaoEncontrado(t *testing.T) {
	turmaX := novaTurmaExistente()
	turmas := &fakeTurmaRepo{byID: turmaX}
	atletas := &fakeAtletaRepoParaTurma{byID: nil}
	uc := NewMatricularAtletaUseCase(turmas, &fakeMatriculaRepo{}, atletas)

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestMatricularAtletaUseCase_Execute_ErroAoBuscarAtleta(t *testing.T) {
	turmaX := novaTurmaExistente()
	turmas := &fakeTurmaRepo{byID: turmaX}
	buscarErr := errors.New("timeout")
	atletas := &fakeAtletaRepoParaTurma{errByID: buscarErr}
	uc := NewMatricularAtletaUseCase(turmas, &fakeMatriculaRepo{}, atletas)

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestMatricularAtletaUseCase_Execute_IdadeForaDaFaixa(t *testing.T) {
	turmaX := novaTurmaExistente() // faixa 8-11
	turmas := &fakeTurmaRepo{byID: turmaX}
	atletas := &fakeAtletaRepoParaTurma{byID: atletaComIdade(15)}
	uc := NewMatricularAtletaUseCase(turmas, &fakeMatriculaRepo{}, atletas)

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrIdadeForaDaFaixa)
}

func TestMatricularAtletaUseCase_Execute_ErroAoVerificarMatriculaExistente(t *testing.T) {
	turmaX := novaTurmaExistente()
	turmas := &fakeTurmaRepo{byID: turmaX}
	atletas := &fakeAtletaRepoParaTurma{byID: atletaComIdade(9)}
	verificarErr := errors.New("db indisponível")
	matriculas := &fakeMatriculaRepo{errAtiva: verificarErr}
	uc := NewMatricularAtletaUseCase(turmas, matriculas, atletas)

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, verificarErr)
}

func TestMatricularAtletaUseCase_Execute_JaMatriculado(t *testing.T) {
	turmaX := novaTurmaExistente()
	turmas := &fakeTurmaRepo{byID: turmaX}
	atletas := &fakeAtletaRepoParaTurma{byID: atletaComIdade(9)}
	matriculas := &fakeMatriculaRepo{ativaExistente: &domainturma.Matricula{ID: uuid.New()}}
	uc := NewMatricularAtletaUseCase(turmas, matriculas, atletas)

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrAtletaJaMatriculado)
}

func TestMatricularAtletaUseCase_Execute_ErroAoContarMatriculasAtivas(t *testing.T) {
	turmaX := novaTurmaExistente()
	turmas := &fakeTurmaRepo{byID: turmaX}
	atletas := &fakeAtletaRepoParaTurma{byID: atletaComIdade(9)}
	countErr := errors.New("db indisponível")
	matriculas := &fakeMatriculaRepo{errCount: countErr}
	uc := NewMatricularAtletaUseCase(turmas, matriculas, atletas)

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, countErr)
}

func TestMatricularAtletaUseCase_Execute_TurmaSemVagas(t *testing.T) {
	turmaX := novaTurmaExistente() // capacidade 20
	turmas := &fakeTurmaRepo{byID: turmaX}
	atletas := &fakeAtletaRepoParaTurma{byID: atletaComIdade(9)}
	matriculas := &fakeMatriculaRepo{countAtivas: 20} // já no limite
	uc := NewMatricularAtletaUseCase(turmas, matriculas, atletas)

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrTurmaSemVagas)
}

func TestMatricularAtletaUseCase_Execute_DataInicioZero(t *testing.T) {
	turmaX := novaTurmaExistente()
	turmas := &fakeTurmaRepo{byID: turmaX}
	atletas := &fakeAtletaRepoParaTurma{byID: atletaComIdade(9)}
	uc := NewMatricularAtletaUseCase(turmas, &fakeMatriculaRepo{}, atletas)

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Time{}})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestMatricularAtletaUseCase_Execute_ErroAoSalvar(t *testing.T) {
	turmaX := novaTurmaExistente()
	turmas := &fakeTurmaRepo{byID: turmaX}
	atletas := &fakeAtletaRepoParaTurma{byID: atletaComIdade(9)}
	saveErr := errors.New("conflito de escrita")
	matriculas := &fakeMatriculaRepo{errSave: saveErr}
	uc := NewMatricularAtletaUseCase(turmas, matriculas, atletas)

	m, err := uc.Execute(context.Background(), MatricularAtletaInput{AtletaID: uuid.New(), TurmaID: turmaX.ID, DataInicio: time.Now()})

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// CancelarMatriculaUseCase
// ─────────────────────────────────────────────────────────────────────────────

func novaMatriculaAtiva() *domainturma.Matricula {
	return &domainturma.Matricula{ID: uuid.New(), AtletaID: uuid.New(), TurmaID: uuid.New(), DataInicio: time.Now(), Status: domainturma.MatriculaAtiva}
}

func TestCancelarMatriculaUseCase_Execute_Sucesso(t *testing.T) {
	existente := novaMatriculaAtiva()
	matriculas := &fakeMatriculaRepo{byID: existente}
	uc := NewCancelarMatriculaUseCase(matriculas)

	m, err := uc.Execute(context.Background(), existente.ID)

	require.NoError(t, err)
	assert.Equal(t, domainturma.MatriculaCancelada, m.Status)
	assert.NotNil(t, m.DataFim)
	assert.Same(t, existente, matriculas.savedM)
}

func TestCancelarMatriculaUseCase_Execute_NaoEncontrada(t *testing.T) {
	matriculas := &fakeMatriculaRepo{byID: nil}
	uc := NewCancelarMatriculaUseCase(matriculas)

	m, err := uc.Execute(context.Background(), uuid.New())

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestCancelarMatriculaUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	matriculas := &fakeMatriculaRepo{errByID: buscarErr}
	uc := NewCancelarMatriculaUseCase(matriculas)

	m, err := uc.Execute(context.Background(), uuid.New())

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestCancelarMatriculaUseCase_Execute_JaCancelada(t *testing.T) {
	existente := novaMatriculaAtiva()
	existente.Status = domainturma.MatriculaCancelada
	matriculas := &fakeMatriculaRepo{byID: existente}
	uc := NewCancelarMatriculaUseCase(matriculas)

	m, err := uc.Execute(context.Background(), existente.ID)

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestCancelarMatriculaUseCase_Execute_ErroAoSalvar(t *testing.T) {
	existente := novaMatriculaAtiva()
	saveErr := errors.New("conflito de escrita")
	matriculas := &fakeMatriculaRepo{byID: existente, errSave: saveErr}
	uc := NewCancelarMatriculaUseCase(matriculas)

	m, err := uc.Execute(context.Background(), existente.ID)

	assert.Nil(t, m)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}
