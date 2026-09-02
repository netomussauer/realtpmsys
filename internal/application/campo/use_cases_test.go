package campo

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	domcampo "github.com/realtpmsys/realtpmsys/internal/domain/campo"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeCampoRepo é um stub do campo.Repository com respostas configuráveis.
type fakeCampoRepo struct {
	campoByID *domcampo.Campo
	errByID   error
	errSave   error

	gotID  uuid.UUID
	savedC *domcampo.Campo
}

func (f *fakeCampoRepo) GetByID(_ context.Context, id uuid.UUID) (*domcampo.Campo, error) {
	f.gotID = id
	return f.campoByID, f.errByID
}

func (f *fakeCampoRepo) List(_ context.Context, _ domcampo.ListFilter) ([]*domcampo.Campo, int64, error) {
	return nil, 0, nil
}

func (f *fakeCampoRepo) Save(_ context.Context, c *domcampo.Campo) error {
	f.savedC = c
	return f.errSave
}

func capacidade(n int) *int { return &n }

// ─────────────────────────────────────────────────────────────────────────────
// CriarCampoUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestCriarCampoUseCase_Execute_Sucesso(t *testing.T) {
	repo := &fakeCampoRepo{}
	uc := NewCriarCampoUseCase(repo)
	endereco := "Rua A, 123"

	c, err := uc.Execute(context.Background(), CriarCampoInput{
		Nome:          "Campo 1",
		Endereco:      &endereco,
		CapacidadeMax: capacidade(20),
	})

	require.NoError(t, err)
	require.NotNil(t, c)
	assert.Equal(t, "Campo 1", c.Nome)
	assert.Equal(t, &endereco, c.Endereco)
	assert.True(t, c.Ativo)
	assert.Same(t, c, repo.savedC, "use case deve persistir a mesma instância retornada")
}

func TestCriarCampoUseCase_Execute_NomeVazio(t *testing.T) {
	repo := &fakeCampoRepo{}
	uc := NewCriarCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), CriarCampoInput{Nome: ""})

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
	assert.Nil(t, repo.savedC, "não deve chamar Save quando a validação de domínio falha")
}

func TestCriarCampoUseCase_Execute_CapacidadeInvalida(t *testing.T) {
	repo := &fakeCampoRepo{}
	uc := NewCriarCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), CriarCampoInput{Nome: "Campo 1", CapacidadeMax: capacidade(0)})

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestCriarCampoUseCase_Execute_ErroAoSalvar(t *testing.T) {
	saveErr := errors.New("db indisponível")
	repo := &fakeCampoRepo{errSave: saveErr}
	uc := NewCriarCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), CriarCampoInput{Nome: "Campo 1"})

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// AtualizarCampoUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestAtualizarCampoUseCase_Execute_Sucesso(t *testing.T) {
	existente := &domcampo.Campo{ID: uuid.New(), Nome: "Antigo", Ativo: true}
	repo := &fakeCampoRepo{campoByID: existente}
	uc := NewAtualizarCampoUseCase(repo)
	novoEndereco := "Rua Nova, 456"

	c, err := uc.Execute(context.Background(), AtualizarCampoInput{
		ID:            existente.ID,
		Nome:          "Novo Nome",
		Endereco:      &novoEndereco,
		CapacidadeMax: capacidade(30),
	})

	require.NoError(t, err)
	require.NotNil(t, c)
	assert.Equal(t, existente.ID, repo.gotID)
	assert.Equal(t, "Novo Nome", c.Nome)
	assert.Equal(t, &novoEndereco, c.Endereco)
	assert.Equal(t, capacidade(30), c.CapacidadeMax)
	assert.Same(t, existente, repo.savedC, "deve atualizar e salvar a mesma entidade buscada")
}

func TestAtualizarCampoUseCase_Execute_NaoEncontrado(t *testing.T) {
	repo := &fakeCampoRepo{campoByID: nil}
	uc := NewAtualizarCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), AtualizarCampoInput{ID: uuid.New(), Nome: "X"})

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestAtualizarCampoUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	repo := &fakeCampoRepo{errByID: buscarErr}
	uc := NewAtualizarCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), AtualizarCampoInput{ID: uuid.New(), Nome: "X"})

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestAtualizarCampoUseCase_Execute_NomeVazio(t *testing.T) {
	existente := &domcampo.Campo{ID: uuid.New(), Nome: "Antigo", Ativo: true}
	repo := &fakeCampoRepo{campoByID: existente}
	uc := NewAtualizarCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), AtualizarCampoInput{ID: existente.ID, Nome: ""})

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
	assert.Nil(t, repo.savedC)
}

func TestAtualizarCampoUseCase_Execute_CapacidadeInvalida(t *testing.T) {
	existente := &domcampo.Campo{ID: uuid.New(), Nome: "Antigo", Ativo: true}
	repo := &fakeCampoRepo{campoByID: existente}
	uc := NewAtualizarCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), AtualizarCampoInput{
		ID: existente.ID, Nome: "Novo", CapacidadeMax: capacidade(-1),
	})

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
	assert.Nil(t, repo.savedC)
}

func TestAtualizarCampoUseCase_Execute_ErroAoSalvar(t *testing.T) {
	existente := &domcampo.Campo{ID: uuid.New(), Nome: "Antigo", Ativo: true}
	saveErr := errors.New("conflito de escrita")
	repo := &fakeCampoRepo{campoByID: existente, errSave: saveErr}
	uc := NewAtualizarCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), AtualizarCampoInput{ID: existente.ID, Nome: "Novo"})

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// ToggleCampoUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestToggleCampoUseCase_Execute_Ativar(t *testing.T) {
	existente := &domcampo.Campo{ID: uuid.New(), Nome: "Campo", Ativo: false}
	repo := &fakeCampoRepo{campoByID: existente}
	uc := NewToggleCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), existente.ID, true)

	require.NoError(t, err)
	require.NotNil(t, c)
	assert.True(t, c.Ativo)
	assert.Same(t, existente, repo.savedC)
}

func TestToggleCampoUseCase_Execute_Inativar(t *testing.T) {
	existente := &domcampo.Campo{ID: uuid.New(), Nome: "Campo", Ativo: true}
	repo := &fakeCampoRepo{campoByID: existente}
	uc := NewToggleCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), existente.ID, false)

	require.NoError(t, err)
	require.NotNil(t, c)
	assert.False(t, c.Ativo)
}

func TestToggleCampoUseCase_Execute_NaoEncontrado(t *testing.T) {
	repo := &fakeCampoRepo{campoByID: nil}
	uc := NewToggleCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), uuid.New(), true)

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestToggleCampoUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	repo := &fakeCampoRepo{errByID: buscarErr}
	uc := NewToggleCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), uuid.New(), true)

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestToggleCampoUseCase_Execute_ErroAoSalvar(t *testing.T) {
	existente := &domcampo.Campo{ID: uuid.New(), Nome: "Campo", Ativo: false}
	saveErr := errors.New("db indisponível")
	repo := &fakeCampoRepo{campoByID: existente, errSave: saveErr}
	uc := NewToggleCampoUseCase(repo)

	c, err := uc.Execute(context.Background(), existente.ID, true)

	assert.Nil(t, c)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}
