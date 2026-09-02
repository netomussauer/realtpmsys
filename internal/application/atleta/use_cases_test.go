package atleta

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	domainatleta "github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeAtletaRepo é um stub do atleta.Repository com respostas configuráveis.
// Compartilhado entre use_cases_test.go e responsavel_use_cases_test.go (mesmo pacote).
type fakeAtletaRepo struct {
	byID               *domainatleta.Atleta
	errByID            error
	byCPF              *domainatleta.Atleta
	errByCPF           error
	isDoResponsavel    bool
	errIsDoResponsavel error
	errSave            error
	errDelete          error

	savedA           *domainatleta.Atleta
	deletedID        uuid.UUID
	softDeleteCalled bool
}

func (f *fakeAtletaRepo) GetByID(_ context.Context, _ uuid.UUID) (*domainatleta.Atleta, error) {
	return f.byID, f.errByID
}

func (f *fakeAtletaRepo) GetByIDPorResponsavel(_ context.Context, _ uuid.UUID, _ uuid.UUID) (*domainatleta.Atleta, error) {
	return f.byID, f.errByID
}

func (f *fakeAtletaRepo) IsAtletaDoResponsavel(_ context.Context, _ uuid.UUID, _ uuid.UUID) (bool, error) {
	return f.isDoResponsavel, f.errIsDoResponsavel
}

func (f *fakeAtletaRepo) GetByCPF(_ context.Context, _ string) (*domainatleta.Atleta, error) {
	return f.byCPF, f.errByCPF
}

func (f *fakeAtletaRepo) List(_ context.Context, _ domainatleta.ListFilter) ([]*domainatleta.Atleta, int64, error) {
	return nil, 0, nil
}

func (f *fakeAtletaRepo) Save(_ context.Context, a *domainatleta.Atleta) error {
	f.savedA = a
	return f.errSave
}

func (f *fakeAtletaRepo) SoftDelete(_ context.Context, id uuid.UUID) error {
	f.softDeleteCalled = true
	f.deletedID = id
	return f.errDelete
}

func strPtr(s string) *string { return &s }

func nascidoEm(ano int, mes time.Month, dia int) time.Time {
	return time.Date(ano, mes, dia, 0, 0, 0, 0, time.UTC)
}

func novoAtletaExistente() *domainatleta.Atleta {
	return &domainatleta.Atleta{
		ID:             uuid.New(),
		Nome:           "Nome Antigo",
		DataNascimento: nascidoEm(2010, time.March, 5),
		CPF:            strPtr("11122233344"),
		Status:         domainatleta.StatusAtivo,
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// CadastrarAtletaUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestCadastrarAtletaUseCase_Execute_Sucesso(t *testing.T) {
	repo := &fakeAtletaRepo{}
	uc := NewCadastrarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), CadastrarAtletaInput{
		Nome:           "Maria",
		DataNascimento: nascidoEm(2012, time.June, 1),
		CPF:            strPtr("12345678901"),
		Email:          strPtr("maria@example.com"),
	})

	require.NoError(t, err)
	require.NotNil(t, a)
	assert.Equal(t, "Maria", a.Nome)
	assert.Equal(t, "12345678901", *a.CPF)
	assert.Equal(t, "maria@example.com", *a.Email)
	assert.Equal(t, domainatleta.StatusAtivo, a.Status)
	assert.Same(t, a, repo.savedA)
}

func TestCadastrarAtletaUseCase_Execute_ErroAoVerificarCPF(t *testing.T) {
	cpfErr := errors.New("db indisponível")
	repo := &fakeAtletaRepo{errByCPF: cpfErr}
	uc := NewCadastrarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), CadastrarAtletaInput{
		Nome: "Maria", DataNascimento: nascidoEm(2012, time.June, 1), CPF: strPtr("12345678901"),
	})

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, cpfErr)
}

func TestCadastrarAtletaUseCase_Execute_CPFJaCadastrado(t *testing.T) {
	repo := &fakeAtletaRepo{byCPF: &domainatleta.Atleta{ID: uuid.New()}}
	uc := NewCadastrarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), CadastrarAtletaInput{
		Nome: "Maria", DataNascimento: nascidoEm(2012, time.June, 1), CPF: strPtr("12345678901"),
	})

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrConflict)
}

func TestCadastrarAtletaUseCase_Execute_NomeVazio(t *testing.T) {
	repo := &fakeAtletaRepo{}
	uc := NewCadastrarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), CadastrarAtletaInput{Nome: "", DataNascimento: nascidoEm(2012, time.June, 1)})

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNomeObrigatorio)
}

func TestCadastrarAtletaUseCase_Execute_DataNascimentoVazia(t *testing.T) {
	repo := &fakeAtletaRepo{}
	uc := NewCadastrarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), CadastrarAtletaInput{Nome: "Maria"})

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestCadastrarAtletaUseCase_Execute_CPFInvalido(t *testing.T) {
	repo := &fakeAtletaRepo{}
	uc := NewCadastrarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), CadastrarAtletaInput{
		Nome: "Maria", DataNascimento: nascidoEm(2012, time.June, 1), CPF: strPtr("123"),
	})

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrCPFInvalido)
	assert.Nil(t, repo.savedA)
}

func TestCadastrarAtletaUseCase_Execute_ErroAoSalvar(t *testing.T) {
	saveErr := errors.New("conflito de escrita")
	repo := &fakeAtletaRepo{errSave: saveErr}
	uc := NewCadastrarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), CadastrarAtletaInput{Nome: "Maria", DataNascimento: nascidoEm(2012, time.June, 1)})

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// AtualizarAtletaUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestAtualizarAtletaUseCase_Execute_Sucesso(t *testing.T) {
	existente := novoAtletaExistente()
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewAtualizarAtletaUseCase(repo)

	novaData := nascidoEm(2011, time.January, 10)
	a, err := uc.Execute(context.Background(), AtualizarAtletaInput{
		ID: existente.ID, Nome: "Nome Novo", DataNascimento: novaData,
	})

	require.NoError(t, err)
	assert.Equal(t, "Nome Novo", a.Nome)
	assert.Equal(t, novaData, a.DataNascimento)
	assert.Same(t, existente, repo.savedA)
}

func TestAtualizarAtletaUseCase_Execute_NaoEncontrado(t *testing.T) {
	repo := &fakeAtletaRepo{byID: nil}
	uc := NewAtualizarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), AtualizarAtletaInput{ID: uuid.New(), Nome: "X"})

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestAtualizarAtletaUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	repo := &fakeAtletaRepo{errByID: buscarErr}
	uc := NewAtualizarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), AtualizarAtletaInput{ID: uuid.New(), Nome: "X"})

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestAtualizarAtletaUseCase_Execute_CPFDeOutroAtleta(t *testing.T) {
	existente := novoAtletaExistente()
	outro := &domainatleta.Atleta{ID: uuid.New(), CPF: strPtr("55566677788")}
	repo := &fakeAtletaRepo{byID: existente, byCPF: outro}
	uc := NewAtualizarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), AtualizarAtletaInput{
		ID: existente.ID, Nome: "Nome Novo", CPF: strPtr("55566677788"),
	})

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrConflict)
}

func TestAtualizarAtletaUseCase_Execute_CPFInalterado_NaoVerificaDuplicidade(t *testing.T) {
	existente := novoAtletaExistente()
	repo := &fakeAtletaRepo{byID: existente, byCPF: &domainatleta.Atleta{ID: uuid.New()}}
	uc := NewAtualizarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), AtualizarAtletaInput{
		ID: existente.ID, Nome: "Nome Novo", CPF: existente.CPF,
	})

	require.NoError(t, err)
	require.NotNil(t, a)
}

func TestAtualizarAtletaUseCase_Execute_DataNascimentoZeroMantemAtual(t *testing.T) {
	existente := novoAtletaExistente()
	dataOriginal := existente.DataNascimento
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewAtualizarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), AtualizarAtletaInput{ID: existente.ID, Nome: "Nome Novo"})

	require.NoError(t, err)
	assert.Equal(t, dataOriginal, a.DataNascimento)
}

func TestAtualizarAtletaUseCase_Execute_NomeVazioMantemAtual(t *testing.T) {
	existente := novoAtletaExistente()
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewAtualizarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), AtualizarAtletaInput{ID: existente.ID, Nome: ""})

	require.NoError(t, err)
	assert.Equal(t, "Nome Antigo", a.Nome)
}

func TestAtualizarAtletaUseCase_Execute_ErroAoSalvar(t *testing.T) {
	existente := novoAtletaExistente()
	saveErr := errors.New("conflito de escrita")
	repo := &fakeAtletaRepo{byID: existente, errSave: saveErr}
	uc := NewAtualizarAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), AtualizarAtletaInput{ID: existente.ID, Nome: "Nome Novo"})

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// MudarStatusAtletaUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestMudarStatusAtletaUseCase_Execute_Inativar(t *testing.T) {
	existente := novoAtletaExistente()
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewMudarStatusAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), existente.ID, AcaoInativar)

	require.NoError(t, err)
	assert.Equal(t, domainatleta.StatusInativo, a.Status)
}

func TestMudarStatusAtletaUseCase_Execute_Suspender(t *testing.T) {
	existente := novoAtletaExistente()
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewMudarStatusAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), existente.ID, AcaoSuspender)

	require.NoError(t, err)
	assert.Equal(t, domainatleta.StatusSuspenso, a.Status)
}

func TestMudarStatusAtletaUseCase_Execute_Reativar(t *testing.T) {
	existente := novoAtletaExistente()
	existente.Status = domainatleta.StatusSuspenso
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewMudarStatusAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), existente.ID, AcaoReativar)

	require.NoError(t, err)
	assert.Equal(t, domainatleta.StatusAtivo, a.Status)
}

func TestMudarStatusAtletaUseCase_Execute_InativarQuandoJaInativo(t *testing.T) {
	existente := novoAtletaExistente()
	existente.Status = domainatleta.StatusInativo
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewMudarStatusAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), existente.ID, AcaoInativar)

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrAtletaJaInativo)
}

func TestMudarStatusAtletaUseCase_Execute_SuspenderQuandoJaSuspenso(t *testing.T) {
	existente := novoAtletaExistente()
	existente.Status = domainatleta.StatusSuspenso
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewMudarStatusAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), existente.ID, AcaoSuspender)

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrAtletaJaSuspenso)
}

func TestMudarStatusAtletaUseCase_Execute_ReativarNaoValidaEstadoAnterior(t *testing.T) {
	// Reativar() não tem guarda de idempotência (ao contrário de Inativar/Suspender) —
	// deve funcionar mesmo se o atleta já estiver ATIVO.
	existente := novoAtletaExistente() // já ATIVO
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewMudarStatusAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), existente.ID, AcaoReativar)

	require.NoError(t, err)
	assert.Equal(t, domainatleta.StatusAtivo, a.Status)
}

func TestMudarStatusAtletaUseCase_Execute_NaoEncontrado(t *testing.T) {
	repo := &fakeAtletaRepo{byID: nil}
	uc := NewMudarStatusAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), uuid.New(), AcaoInativar)

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestMudarStatusAtletaUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	repo := &fakeAtletaRepo{errByID: buscarErr}
	uc := NewMudarStatusAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), uuid.New(), AcaoInativar)

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestMudarStatusAtletaUseCase_Execute_AcaoInvalida(t *testing.T) {
	existente := novoAtletaExistente()
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewMudarStatusAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), existente.ID, AcaoStatus("VOAR"))

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestMudarStatusAtletaUseCase_Execute_ErroAoSalvar(t *testing.T) {
	existente := novoAtletaExistente()
	saveErr := errors.New("conflito de escrita")
	repo := &fakeAtletaRepo{byID: existente, errSave: saveErr}
	uc := NewMudarStatusAtletaUseCase(repo)

	a, err := uc.Execute(context.Background(), existente.ID, AcaoInativar)

	assert.Nil(t, a)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// RemoverAtletaUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestRemoverAtletaUseCase_Execute_Sucesso(t *testing.T) {
	existente := novoAtletaExistente()
	repo := &fakeAtletaRepo{byID: existente}
	uc := NewRemoverAtletaUseCase(repo)

	err := uc.Execute(context.Background(), existente.ID)

	require.NoError(t, err)
	assert.True(t, repo.softDeleteCalled)
	assert.Equal(t, existente.ID, repo.deletedID)
}

func TestRemoverAtletaUseCase_Execute_NaoEncontrado(t *testing.T) {
	repo := &fakeAtletaRepo{byID: nil}
	uc := NewRemoverAtletaUseCase(repo)

	err := uc.Execute(context.Background(), uuid.New())

	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
	assert.False(t, repo.softDeleteCalled)
}

func TestRemoverAtletaUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	repo := &fakeAtletaRepo{errByID: buscarErr}
	uc := NewRemoverAtletaUseCase(repo)

	err := uc.Execute(context.Background(), uuid.New())

	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestRemoverAtletaUseCase_Execute_ErroAoRemover(t *testing.T) {
	existente := novoAtletaExistente()
	deleteErr := errors.New("db indisponível")
	repo := &fakeAtletaRepo{byID: existente, errDelete: deleteErr}
	uc := NewRemoverAtletaUseCase(repo)

	err := uc.Execute(context.Background(), existente.ID)

	require.Error(t, err)
	assert.ErrorIs(t, err, deleteErr)
}
