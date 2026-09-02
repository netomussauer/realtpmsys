package treinador

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	domtreinador "github.com/realtpmsys/realtpmsys/internal/domain/treinador"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeTreinadorRepo é um stub do treinador.Repository com respostas configuráveis.
type fakeTreinadorRepo struct {
	byID           *domtreinador.Treinador
	errByID        error
	byCPF          *domtreinador.Treinador
	errByCPF       error
	byUsuarioID    *domtreinador.Treinador
	errByUsuarioID error
	errSave        error
	errDelete      error

	savedT           *domtreinador.Treinador
	deletedID        uuid.UUID
	softDeleteCalled bool
}

func (f *fakeTreinadorRepo) GetByID(_ context.Context, _ uuid.UUID) (*domtreinador.Treinador, error) {
	return f.byID, f.errByID
}

func (f *fakeTreinadorRepo) GetByCPF(_ context.Context, _ string) (*domtreinador.Treinador, error) {
	return f.byCPF, f.errByCPF
}

func (f *fakeTreinadorRepo) GetByUsuarioID(_ context.Context, _ uuid.UUID) (*domtreinador.Treinador, error) {
	return f.byUsuarioID, f.errByUsuarioID
}

func (f *fakeTreinadorRepo) List(_ context.Context, _ domtreinador.ListFilter) ([]*domtreinador.Treinador, int64, error) {
	return nil, 0, nil
}

func (f *fakeTreinadorRepo) Save(_ context.Context, t *domtreinador.Treinador) error {
	f.savedT = t
	return f.errSave
}

func (f *fakeTreinadorRepo) SoftDelete(_ context.Context, id uuid.UUID) error {
	f.softDeleteCalled = true
	f.deletedID = id
	return f.errDelete
}

// fakeUsuarioRepo é um stub do identidade.Repository (só GetByID é usado aqui).
type fakeUsuarioRepo struct {
	usuarioByID *identidade.Usuario
	errByID     error
}

func (f *fakeUsuarioRepo) GetByEmail(_ context.Context, _ string) (*identidade.Usuario, error) {
	return nil, nil
}

func (f *fakeUsuarioRepo) GetByID(_ context.Context, _ uuid.UUID) (*identidade.Usuario, error) {
	return f.usuarioByID, f.errByID
}

func strPtr(s string) *string { return &s }

// ─────────────────────────────────────────────────────────────────────────────
// CadastrarTreinadorUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestCadastrarTreinadorUseCase_Execute_Sucesso(t *testing.T) {
	usuarioID := uuid.New()
	usuarios := &fakeUsuarioRepo{usuarioByID: &identidade.Usuario{ID: usuarioID}}
	treinadores := &fakeTreinadorRepo{}
	uc := NewCadastrarTreinadorUseCase(treinadores, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{
		UsuarioID: usuarioID,
		Nome:      "João",
		CPF:       strPtr("12345678901"),
		CREF:      strPtr("123456-G/SP"),
		Telefone:  strPtr("11999999999"),
	})

	require.NoError(t, err)
	require.NotNil(t, tr)
	assert.Equal(t, usuarioID, tr.UsuarioID)
	assert.Equal(t, "João", tr.Nome)
	assert.Equal(t, "12345678901", *tr.CPF)
	assert.Equal(t, domtreinador.StatusAtivo, tr.Status)
	assert.Same(t, tr, treinadores.savedT)
}

func TestCadastrarTreinadorUseCase_Execute_SemCPF(t *testing.T) {
	usuarioID := uuid.New()
	usuarios := &fakeUsuarioRepo{usuarioByID: &identidade.Usuario{ID: usuarioID}}
	treinadores := &fakeTreinadorRepo{}
	uc := NewCadastrarTreinadorUseCase(treinadores, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{UsuarioID: usuarioID, Nome: "João"})

	require.NoError(t, err)
	require.NotNil(t, tr)
	assert.Nil(t, tr.CPF)
}

func TestCadastrarTreinadorUseCase_Execute_ErroAoBuscarUsuario(t *testing.T) {
	buscarErr := errors.New("timeout")
	usuarios := &fakeUsuarioRepo{errByID: buscarErr}
	uc := NewCadastrarTreinadorUseCase(&fakeTreinadorRepo{}, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{UsuarioID: uuid.New(), Nome: "João"})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestCadastrarTreinadorUseCase_Execute_UsuarioNaoEncontrado(t *testing.T) {
	usuarios := &fakeUsuarioRepo{usuarioByID: nil}
	uc := NewCadastrarTreinadorUseCase(&fakeTreinadorRepo{}, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{UsuarioID: uuid.New(), Nome: "João"})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestCadastrarTreinadorUseCase_Execute_ErroAoVerificarTreinadorExistente(t *testing.T) {
	usuarioID := uuid.New()
	usuarios := &fakeUsuarioRepo{usuarioByID: &identidade.Usuario{ID: usuarioID}}
	verificarErr := errors.New("db indisponível")
	treinadores := &fakeTreinadorRepo{errByUsuarioID: verificarErr}
	uc := NewCadastrarTreinadorUseCase(treinadores, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{UsuarioID: usuarioID, Nome: "João"})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, verificarErr)
}

func TestCadastrarTreinadorUseCase_Execute_UsuarioJaVinculado(t *testing.T) {
	usuarioID := uuid.New()
	usuarios := &fakeUsuarioRepo{usuarioByID: &identidade.Usuario{ID: usuarioID}}
	treinadores := &fakeTreinadorRepo{byUsuarioID: &domtreinador.Treinador{ID: uuid.New(), UsuarioID: usuarioID}}
	uc := NewCadastrarTreinadorUseCase(treinadores, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{UsuarioID: usuarioID, Nome: "João"})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrConflict)
}

func TestCadastrarTreinadorUseCase_Execute_ErroAoVerificarCPF(t *testing.T) {
	usuarioID := uuid.New()
	usuarios := &fakeUsuarioRepo{usuarioByID: &identidade.Usuario{ID: usuarioID}}
	cpfErr := errors.New("db indisponível")
	treinadores := &fakeTreinadorRepo{errByCPF: cpfErr}
	uc := NewCadastrarTreinadorUseCase(treinadores, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{
		UsuarioID: usuarioID, Nome: "João", CPF: strPtr("12345678901"),
	})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, cpfErr)
}

func TestCadastrarTreinadorUseCase_Execute_CPFJaCadastrado(t *testing.T) {
	usuarioID := uuid.New()
	usuarios := &fakeUsuarioRepo{usuarioByID: &identidade.Usuario{ID: usuarioID}}
	treinadores := &fakeTreinadorRepo{byCPF: &domtreinador.Treinador{ID: uuid.New()}}
	uc := NewCadastrarTreinadorUseCase(treinadores, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{
		UsuarioID: usuarioID, Nome: "João", CPF: strPtr("12345678901"),
	})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrConflict)
}

func TestCadastrarTreinadorUseCase_Execute_NomeVazio(t *testing.T) {
	usuarioID := uuid.New()
	usuarios := &fakeUsuarioRepo{usuarioByID: &identidade.Usuario{ID: usuarioID}}
	uc := NewCadastrarTreinadorUseCase(&fakeTreinadorRepo{}, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{UsuarioID: usuarioID, Nome: ""})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNomeObrigatorio)
}

func TestCadastrarTreinadorUseCase_Execute_CPFInvalido(t *testing.T) {
	usuarioID := uuid.New()
	usuarios := &fakeUsuarioRepo{usuarioByID: &identidade.Usuario{ID: usuarioID}}
	treinadores := &fakeTreinadorRepo{}
	uc := NewCadastrarTreinadorUseCase(treinadores, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{
		UsuarioID: usuarioID, Nome: "João", CPF: strPtr("123"),
	})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrCPFInvalido)
	assert.Nil(t, treinadores.savedT, "não deve salvar quando o CPF é inválido")
}

func TestCadastrarTreinadorUseCase_Execute_ErroAoSalvar(t *testing.T) {
	usuarioID := uuid.New()
	usuarios := &fakeUsuarioRepo{usuarioByID: &identidade.Usuario{ID: usuarioID}}
	saveErr := errors.New("conflito de escrita")
	treinadores := &fakeTreinadorRepo{errSave: saveErr}
	uc := NewCadastrarTreinadorUseCase(treinadores, usuarios)

	tr, err := uc.Execute(context.Background(), CadastrarTreinadorInput{UsuarioID: usuarioID, Nome: "João"})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// AtualizarTreinadorUseCase
// ─────────────────────────────────────────────────────────────────────────────

func novoTreinadorExistente() *domtreinador.Treinador {
	return &domtreinador.Treinador{
		ID:        uuid.New(),
		UsuarioID: uuid.New(),
		Nome:      "Nome Antigo",
		CPF:       strPtr("11122233344"),
		Status:    domtreinador.StatusAtivo,
	}
}

func TestAtualizarTreinadorUseCase_Execute_Sucesso(t *testing.T) {
	existente := novoTreinadorExistente()
	treinadores := &fakeTreinadorRepo{byID: existente}
	uc := NewAtualizarTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), AtualizarTreinadorInput{
		ID: existente.ID, Nome: "Nome Novo", CREF: strPtr("999-G/SP"), Telefone: strPtr("11988887777"),
	})

	require.NoError(t, err)
	require.NotNil(t, tr)
	assert.Equal(t, "Nome Novo", tr.Nome)
	assert.Equal(t, "999-G/SP", *tr.CREF)
	assert.Same(t, existente, treinadores.savedT)
}

func TestAtualizarTreinadorUseCase_Execute_NaoEncontrado(t *testing.T) {
	treinadores := &fakeTreinadorRepo{byID: nil}
	uc := NewAtualizarTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), AtualizarTreinadorInput{ID: uuid.New(), Nome: "X"})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestAtualizarTreinadorUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	treinadores := &fakeTreinadorRepo{errByID: buscarErr}
	uc := NewAtualizarTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), AtualizarTreinadorInput{ID: uuid.New(), Nome: "X"})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestAtualizarTreinadorUseCase_Execute_CPFInalterado_NaoVerificaDuplicidade(t *testing.T) {
	existente := novoTreinadorExistente()
	treinadores := &fakeTreinadorRepo{byID: existente, byCPF: &domtreinador.Treinador{ID: uuid.New()}}
	uc := NewAtualizarTreinadorUseCase(treinadores)

	// Mesmo CPF do treinador já existente — não deve consultar GetByCPF nem falhar por conflito.
	tr, err := uc.Execute(context.Background(), AtualizarTreinadorInput{
		ID: existente.ID, Nome: "Nome Novo", CPF: existente.CPF,
	})

	require.NoError(t, err)
	require.NotNil(t, tr)
}

func TestAtualizarTreinadorUseCase_Execute_CPFAlterado_Sucesso(t *testing.T) {
	existente := novoTreinadorExistente()
	treinadores := &fakeTreinadorRepo{byID: existente, byCPF: nil}
	uc := NewAtualizarTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), AtualizarTreinadorInput{
		ID: existente.ID, Nome: "Nome Novo", CPF: strPtr("55566677788"),
	})

	require.NoError(t, err)
	assert.Equal(t, "55566677788", *tr.CPF)
}

func TestAtualizarTreinadorUseCase_Execute_ErroAoVerificarCPF(t *testing.T) {
	existente := novoTreinadorExistente()
	cpfErr := errors.New("db indisponível")
	treinadores := &fakeTreinadorRepo{byID: existente, errByCPF: cpfErr}
	uc := NewAtualizarTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), AtualizarTreinadorInput{
		ID: existente.ID, Nome: "Nome Novo", CPF: strPtr("55566677788"),
	})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, cpfErr)
}

func TestAtualizarTreinadorUseCase_Execute_CPFDeOutroTreinador(t *testing.T) {
	existente := novoTreinadorExistente()
	outro := &domtreinador.Treinador{ID: uuid.New(), CPF: strPtr("55566677788")}
	treinadores := &fakeTreinadorRepo{byID: existente, byCPF: outro}
	uc := NewAtualizarTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), AtualizarTreinadorInput{
		ID: existente.ID, Nome: "Nome Novo", CPF: strPtr("55566677788"),
	})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrConflict)
}

func TestAtualizarTreinadorUseCase_Execute_CPFInvalido(t *testing.T) {
	existente := novoTreinadorExistente()
	treinadores := &fakeTreinadorRepo{byID: existente, byCPF: nil}
	uc := NewAtualizarTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), AtualizarTreinadorInput{
		ID: existente.ID, Nome: "Nome Novo", CPF: strPtr("abc"),
	})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrCPFInvalido)
}

func TestAtualizarTreinadorUseCase_Execute_NomeVazioMantemAtual(t *testing.T) {
	existente := novoTreinadorExistente()
	treinadores := &fakeTreinadorRepo{byID: existente}
	uc := NewAtualizarTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), AtualizarTreinadorInput{ID: existente.ID, Nome: ""})

	require.NoError(t, err)
	assert.Equal(t, "Nome Antigo", tr.Nome, "nome vazio no input não deve sobrescrever o nome atual")
}

func TestAtualizarTreinadorUseCase_Execute_ErroAoSalvar(t *testing.T) {
	existente := novoTreinadorExistente()
	saveErr := errors.New("conflito de escrita")
	treinadores := &fakeTreinadorRepo{byID: existente, errSave: saveErr}
	uc := NewAtualizarTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), AtualizarTreinadorInput{ID: existente.ID, Nome: "Nome Novo"})

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// MudarStatusTreinadorUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestMudarStatusTreinadorUseCase_Execute_Ativar(t *testing.T) {
	existente := novoTreinadorExistente()
	existente.Status = domtreinador.StatusInativo
	treinadores := &fakeTreinadorRepo{byID: existente}
	uc := NewMudarStatusTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), existente.ID, AcaoAtivar)

	require.NoError(t, err)
	assert.Equal(t, domtreinador.StatusAtivo, tr.Status)
}

func TestMudarStatusTreinadorUseCase_Execute_Inativar(t *testing.T) {
	existente := novoTreinadorExistente()
	treinadores := &fakeTreinadorRepo{byID: existente}
	uc := NewMudarStatusTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), existente.ID, AcaoInativar)

	require.NoError(t, err)
	assert.Equal(t, domtreinador.StatusInativo, tr.Status)
}

func TestMudarStatusTreinadorUseCase_Execute_AtivarQuandoJaAtivo(t *testing.T) {
	existente := novoTreinadorExistente() // já ATIVO
	treinadores := &fakeTreinadorRepo{byID: existente}
	uc := NewMudarStatusTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), existente.ID, AcaoAtivar)

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestMudarStatusTreinadorUseCase_Execute_InativarQuandoJaInativo(t *testing.T) {
	existente := novoTreinadorExistente()
	existente.Status = domtreinador.StatusInativo
	treinadores := &fakeTreinadorRepo{byID: existente}
	uc := NewMudarStatusTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), existente.ID, AcaoInativar)

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestMudarStatusTreinadorUseCase_Execute_NaoEncontrado(t *testing.T) {
	treinadores := &fakeTreinadorRepo{byID: nil}
	uc := NewMudarStatusTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), uuid.New(), AcaoAtivar)

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestMudarStatusTreinadorUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	treinadores := &fakeTreinadorRepo{errByID: buscarErr}
	uc := NewMudarStatusTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), uuid.New(), AcaoAtivar)

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestMudarStatusTreinadorUseCase_Execute_AcaoInvalida(t *testing.T) {
	existente := novoTreinadorExistente()
	treinadores := &fakeTreinadorRepo{byID: existente}
	uc := NewMudarStatusTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), existente.ID, AcaoStatus("VOAR"))

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestMudarStatusTreinadorUseCase_Execute_ErroAoSalvar(t *testing.T) {
	existente := novoTreinadorExistente()
	saveErr := errors.New("conflito de escrita")
	treinadores := &fakeTreinadorRepo{byID: existente, errSave: saveErr}
	uc := NewMudarStatusTreinadorUseCase(treinadores)

	tr, err := uc.Execute(context.Background(), existente.ID, AcaoInativar)

	assert.Nil(t, tr)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// RemoverTreinadorUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestRemoverTreinadorUseCase_Execute_Sucesso(t *testing.T) {
	existente := novoTreinadorExistente()
	treinadores := &fakeTreinadorRepo{byID: existente}
	uc := NewRemoverTreinadorUseCase(treinadores)

	err := uc.Execute(context.Background(), existente.ID)

	require.NoError(t, err)
	assert.True(t, treinadores.softDeleteCalled)
	assert.Equal(t, existente.ID, treinadores.deletedID)
}

func TestRemoverTreinadorUseCase_Execute_NaoEncontrado(t *testing.T) {
	treinadores := &fakeTreinadorRepo{byID: nil}
	uc := NewRemoverTreinadorUseCase(treinadores)

	err := uc.Execute(context.Background(), uuid.New())

	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
	assert.False(t, treinadores.softDeleteCalled)
}

func TestRemoverTreinadorUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	treinadores := &fakeTreinadorRepo{errByID: buscarErr}
	uc := NewRemoverTreinadorUseCase(treinadores)

	err := uc.Execute(context.Background(), uuid.New())

	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestRemoverTreinadorUseCase_Execute_ErroAoRemover(t *testing.T) {
	existente := novoTreinadorExistente()
	deleteErr := errors.New("db indisponível")
	treinadores := &fakeTreinadorRepo{byID: existente, errDelete: deleteErr}
	uc := NewRemoverTreinadorUseCase(treinadores)

	err := uc.Execute(context.Background(), existente.ID)

	require.Error(t, err)
	assert.ErrorIs(t, err, deleteErr)
}
