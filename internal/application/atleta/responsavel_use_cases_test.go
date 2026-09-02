package atleta

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	domainatleta "github.com/realtpmsys/realtpmsys/internal/domain/atleta"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeResponsavelRepo é um stub do atleta.ResponsavelRepository com respostas configuráveis.
type fakeResponsavelRepo struct {
	byID      *domainatleta.Responsavel
	errByID   error
	byCPF     *domainatleta.Responsavel
	errByCPF  error
	errSave   error
	errDelete error

	savedR       *domainatleta.Responsavel
	deletedID    uuid.UUID
	deleteCalled bool
}

func (f *fakeResponsavelRepo) GetByID(_ context.Context, _ uuid.UUID) (*domainatleta.Responsavel, error) {
	return f.byID, f.errByID
}

func (f *fakeResponsavelRepo) GetByCPF(_ context.Context, _ string) (*domainatleta.Responsavel, error) {
	return f.byCPF, f.errByCPF
}

func (f *fakeResponsavelRepo) ListByAtleta(_ context.Context, _ uuid.UUID) ([]*domainatleta.Responsavel, error) {
	return nil, nil
}

func (f *fakeResponsavelRepo) GetPrincipalDoAtleta(_ context.Context, _ uuid.UUID) (*domainatleta.Responsavel, error) {
	return nil, nil
}

func (f *fakeResponsavelRepo) SaveWithPrincipalSwap(_ context.Context, r *domainatleta.Responsavel) error {
	f.savedR = r
	return f.errSave
}

func (f *fakeResponsavelRepo) Delete(_ context.Context, id uuid.UUID) error {
	f.deleteCalled = true
	f.deletedID = id
	return f.errDelete
}

// fakeUniformeRepo é um stub do atleta.UniformeRepository com respostas configuráveis.
type fakeUniformeRepo struct {
	byAtleta    *domainatleta.Uniforme
	errByAtleta error
	errSave     error

	savedU *domainatleta.Uniforme
}

func (f *fakeUniformeRepo) GetByAtleta(_ context.Context, _ uuid.UUID) (*domainatleta.Uniforme, error) {
	return f.byAtleta, f.errByAtleta
}

func (f *fakeUniformeRepo) Save(_ context.Context, u *domainatleta.Uniforme) error {
	f.savedU = u
	return f.errSave
}

// ─────────────────────────────────────────────────────────────────────────────
// AdicionarResponsavelUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestAdicionarResponsavelUseCase_Execute_Sucesso(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	responsaveis := &fakeResponsavelRepo{}
	uc := NewAdicionarResponsavelUseCase(atletas, responsaveis)

	r, err := uc.Execute(context.Background(), AdicionarResponsavelInput{
		AtletaID:         atletaID,
		Nome:             "Pai",
		Telefone:         "11999999999",
		Parentesco:       domainatleta.ParentescoPai,
		CPF:              strPtr("12345678901"),
		Email:            strPtr("pai@example.com"),
		ContatoPrincipal: true,
	})

	require.NoError(t, err)
	require.NotNil(t, r)
	assert.Equal(t, atletaID, r.AtletaID)
	assert.Equal(t, "Pai", r.Nome)
	assert.Equal(t, "12345678901", *r.CPF)
	assert.Equal(t, "pai@example.com", *r.Email)
	assert.True(t, r.ContatoPrincipal)
	assert.Same(t, r, responsaveis.savedR)
}

func TestAdicionarResponsavelUseCase_Execute_AtletaNaoEncontrado(t *testing.T) {
	atletas := &fakeAtletaRepo{byID: nil}
	uc := NewAdicionarResponsavelUseCase(atletas, &fakeResponsavelRepo{})

	r, err := uc.Execute(context.Background(), AdicionarResponsavelInput{
		AtletaID: uuid.New(), Nome: "Pai", Telefone: "11999999999", Parentesco: domainatleta.ParentescoPai,
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestAdicionarResponsavelUseCase_Execute_ErroAoBuscarAtleta(t *testing.T) {
	buscarErr := errors.New("timeout")
	atletas := &fakeAtletaRepo{errByID: buscarErr}
	uc := NewAdicionarResponsavelUseCase(atletas, &fakeResponsavelRepo{})

	r, err := uc.Execute(context.Background(), AdicionarResponsavelInput{
		AtletaID: uuid.New(), Nome: "Pai", Telefone: "11999999999", Parentesco: domainatleta.ParentescoPai,
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestAdicionarResponsavelUseCase_Execute_ErroAoVerificarCPF(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	cpfErr := errors.New("db indisponível")
	responsaveis := &fakeResponsavelRepo{errByCPF: cpfErr}
	uc := NewAdicionarResponsavelUseCase(atletas, responsaveis)

	r, err := uc.Execute(context.Background(), AdicionarResponsavelInput{
		AtletaID: atletaID, Nome: "Pai", Telefone: "11999999999", Parentesco: domainatleta.ParentescoPai,
		CPF: strPtr("12345678901"),
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, cpfErr)
}

func TestAdicionarResponsavelUseCase_Execute_CPFJaCadastrado(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	responsaveis := &fakeResponsavelRepo{byCPF: &domainatleta.Responsavel{ID: uuid.New()}}
	uc := NewAdicionarResponsavelUseCase(atletas, responsaveis)

	r, err := uc.Execute(context.Background(), AdicionarResponsavelInput{
		AtletaID: atletaID, Nome: "Pai", Telefone: "11999999999", Parentesco: domainatleta.ParentescoPai,
		CPF: strPtr("12345678901"),
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrConflict)
}

func TestAdicionarResponsavelUseCase_Execute_TelefoneVazio(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	uc := NewAdicionarResponsavelUseCase(atletas, &fakeResponsavelRepo{})

	r, err := uc.Execute(context.Background(), AdicionarResponsavelInput{
		AtletaID: atletaID, Nome: "Pai", Telefone: "", Parentesco: domainatleta.ParentescoPai,
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestAdicionarResponsavelUseCase_Execute_ParentescoInvalido(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	uc := NewAdicionarResponsavelUseCase(atletas, &fakeResponsavelRepo{})

	r, err := uc.Execute(context.Background(), AdicionarResponsavelInput{
		AtletaID: atletaID, Nome: "Pai", Telefone: "11999999999", Parentesco: domainatleta.Parentesco("TIO"),
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestAdicionarResponsavelUseCase_Execute_CPFInvalido(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	responsaveis := &fakeResponsavelRepo{}
	uc := NewAdicionarResponsavelUseCase(atletas, responsaveis)

	r, err := uc.Execute(context.Background(), AdicionarResponsavelInput{
		AtletaID: atletaID, Nome: "Pai", Telefone: "11999999999", Parentesco: domainatleta.ParentescoPai,
		CPF: strPtr("abc"),
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrCPFInvalido)
	assert.Nil(t, responsaveis.savedR)
}

func TestAdicionarResponsavelUseCase_Execute_ErroAoSalvar(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	saveErr := errors.New("conflito de escrita")
	responsaveis := &fakeResponsavelRepo{errSave: saveErr}
	uc := NewAdicionarResponsavelUseCase(atletas, responsaveis)

	r, err := uc.Execute(context.Background(), AdicionarResponsavelInput{
		AtletaID: atletaID, Nome: "Pai", Telefone: "11999999999", Parentesco: domainatleta.ParentescoPai,
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// AtualizarResponsavelUseCase
// ─────────────────────────────────────────────────────────────────────────────

func novoResponsavelExistente() *domainatleta.Responsavel {
	return &domainatleta.Responsavel{
		ID:         uuid.New(),
		AtletaID:   uuid.New(),
		Nome:       "Nome Antigo",
		Telefone:   "11988887777",
		Parentesco: domainatleta.ParentescoMae,
		CPF:        strPtr("11122233344"),
		Email:      strPtr("antigo@example.com"),
	}
}

func TestAtualizarResponsavelUseCase_Execute_Sucesso(t *testing.T) {
	existente := novoResponsavelExistente()
	responsaveis := &fakeResponsavelRepo{byID: existente}
	uc := NewAtualizarResponsavelUseCase(responsaveis)

	r, err := uc.Execute(context.Background(), AtualizarResponsavelInput{
		ID: existente.ID, Nome: "Nome Novo", Telefone: "11977776666",
		Parentesco: domainatleta.ParentescoPai, Email: strPtr("novo@example.com"), ContatoPrincipal: true,
	})

	require.NoError(t, err)
	assert.Equal(t, "Nome Novo", r.Nome)
	assert.Equal(t, "11977776666", r.Telefone)
	assert.Equal(t, domainatleta.ParentescoPai, r.Parentesco)
	assert.Equal(t, "novo@example.com", *r.Email)
	assert.True(t, r.ContatoPrincipal)
	assert.Same(t, existente, responsaveis.savedR)
}

func TestAtualizarResponsavelUseCase_Execute_NaoEncontrado(t *testing.T) {
	responsaveis := &fakeResponsavelRepo{byID: nil}
	uc := NewAtualizarResponsavelUseCase(responsaveis)

	r, err := uc.Execute(context.Background(), AtualizarResponsavelInput{ID: uuid.New(), Nome: "X"})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestAtualizarResponsavelUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	responsaveis := &fakeResponsavelRepo{errByID: buscarErr}
	uc := NewAtualizarResponsavelUseCase(responsaveis)

	r, err := uc.Execute(context.Background(), AtualizarResponsavelInput{ID: uuid.New(), Nome: "X"})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestAtualizarResponsavelUseCase_Execute_CPFDeOutroResponsavel(t *testing.T) {
	existente := novoResponsavelExistente()
	outro := &domainatleta.Responsavel{ID: uuid.New(), CPF: strPtr("55566677788")}
	responsaveis := &fakeResponsavelRepo{byID: existente, byCPF: outro}
	uc := NewAtualizarResponsavelUseCase(responsaveis)

	r, err := uc.Execute(context.Background(), AtualizarResponsavelInput{
		ID: existente.ID, Nome: "X", Telefone: "119", Parentesco: domainatleta.ParentescoMae, CPF: strPtr("55566677788"),
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrConflict)
}

func TestAtualizarResponsavelUseCase_Execute_ErroAoVerificarCPF(t *testing.T) {
	existente := novoResponsavelExistente()
	cpfErr := errors.New("db indisponível")
	responsaveis := &fakeResponsavelRepo{byID: existente, errByCPF: cpfErr}
	uc := NewAtualizarResponsavelUseCase(responsaveis)

	r, err := uc.Execute(context.Background(), AtualizarResponsavelInput{
		ID: existente.ID, Nome: "X", Telefone: "119", Parentesco: domainatleta.ParentescoMae, CPF: strPtr("55566677788"),
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, cpfErr)
}

func TestAtualizarResponsavelUseCase_Execute_CPFNilRemoveCPFExistente(t *testing.T) {
	existente := novoResponsavelExistente() // já tem CPF
	responsaveis := &fakeResponsavelRepo{byID: existente}
	uc := NewAtualizarResponsavelUseCase(responsaveis)

	r, err := uc.Execute(context.Background(), AtualizarResponsavelInput{
		ID: existente.ID, Nome: "X", Telefone: "119", Parentesco: domainatleta.ParentescoMae, CPF: nil,
	})

	require.NoError(t, err)
	assert.Nil(t, r.CPF, "CPF ausente no input deve limpar o CPF existente")
}

func TestAtualizarResponsavelUseCase_Execute_EmailNilRemoveEmailExistente(t *testing.T) {
	existente := novoResponsavelExistente() // já tem Email
	responsaveis := &fakeResponsavelRepo{byID: existente}
	uc := NewAtualizarResponsavelUseCase(responsaveis)

	r, err := uc.Execute(context.Background(), AtualizarResponsavelInput{
		ID: existente.ID, Nome: "X", Telefone: "119", Parentesco: domainatleta.ParentescoMae, Email: nil,
	})

	require.NoError(t, err)
	assert.Nil(t, r.Email, "email ausente no input deve limpar o email existente")
}

func TestAtualizarResponsavelUseCase_Execute_ParentescoInvalido(t *testing.T) {
	existente := novoResponsavelExistente()
	responsaveis := &fakeResponsavelRepo{byID: existente}
	uc := NewAtualizarResponsavelUseCase(responsaveis)

	r, err := uc.Execute(context.Background(), AtualizarResponsavelInput{
		ID: existente.ID, Nome: "X", Telefone: "119", Parentesco: domainatleta.Parentesco("TIO"),
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestAtualizarResponsavelUseCase_Execute_ParentescoVazioMantemAtual(t *testing.T) {
	existente := novoResponsavelExistente() // ParentescoMae
	responsaveis := &fakeResponsavelRepo{byID: existente}
	uc := NewAtualizarResponsavelUseCase(responsaveis)

	r, err := uc.Execute(context.Background(), AtualizarResponsavelInput{
		ID: existente.ID, Nome: "X", Telefone: "119", Parentesco: "",
	})

	require.NoError(t, err)
	assert.Equal(t, domainatleta.ParentescoMae, r.Parentesco)
}

func TestAtualizarResponsavelUseCase_Execute_ErroAoSalvar(t *testing.T) {
	existente := novoResponsavelExistente()
	saveErr := errors.New("conflito de escrita")
	responsaveis := &fakeResponsavelRepo{byID: existente, errSave: saveErr}
	uc := NewAtualizarResponsavelUseCase(responsaveis)

	r, err := uc.Execute(context.Background(), AtualizarResponsavelInput{
		ID: existente.ID, Nome: "X", Telefone: "119", Parentesco: domainatleta.ParentescoMae,
	})

	assert.Nil(t, r)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// RemoverResponsavelUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestRemoverResponsavelUseCase_Execute_Sucesso(t *testing.T) {
	existente := novoResponsavelExistente()
	responsaveis := &fakeResponsavelRepo{byID: existente}
	uc := NewRemoverResponsavelUseCase(responsaveis)

	err := uc.Execute(context.Background(), existente.ID)

	require.NoError(t, err)
	assert.True(t, responsaveis.deleteCalled)
	assert.Equal(t, existente.ID, responsaveis.deletedID)
}

func TestRemoverResponsavelUseCase_Execute_NaoEncontrado(t *testing.T) {
	responsaveis := &fakeResponsavelRepo{byID: nil}
	uc := NewRemoverResponsavelUseCase(responsaveis)

	err := uc.Execute(context.Background(), uuid.New())

	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
	assert.False(t, responsaveis.deleteCalled)
}

func TestRemoverResponsavelUseCase_Execute_ErroAoBuscar(t *testing.T) {
	buscarErr := errors.New("timeout")
	responsaveis := &fakeResponsavelRepo{errByID: buscarErr}
	uc := NewRemoverResponsavelUseCase(responsaveis)

	err := uc.Execute(context.Background(), uuid.New())

	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestRemoverResponsavelUseCase_Execute_ErroAoRemover(t *testing.T) {
	existente := novoResponsavelExistente()
	deleteErr := errors.New("db indisponível")
	responsaveis := &fakeResponsavelRepo{byID: existente, errDelete: deleteErr}
	uc := NewRemoverResponsavelUseCase(responsaveis)

	err := uc.Execute(context.Background(), existente.ID)

	require.Error(t, err)
	assert.ErrorIs(t, err, deleteErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// SetUniformeUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestSetUniformeUseCase_Execute_CriaQuandoNaoExiste(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	uniformes := &fakeUniformeRepo{byAtleta: nil}
	uc := NewSetUniformeUseCase(atletas, uniformes)

	u, err := uc.Execute(context.Background(), SetUniformeInput{
		AtletaID: atletaID, TamCamisa: "M", TamShort: "G", TamChuteira: "40",
	})

	require.NoError(t, err)
	require.NotNil(t, u)
	assert.Equal(t, atletaID, u.AtletaID)
	assert.Equal(t, "M", u.TamCamisa)
	assert.Same(t, u, uniformes.savedU)
}

func TestSetUniformeUseCase_Execute_AtualizaQuandoJaExiste(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	existente := &domainatleta.Uniforme{ID: uuid.New(), AtletaID: atletaID, TamCamisa: "P", TamShort: "P", TamChuteira: "38"}
	uniformes := &fakeUniformeRepo{byAtleta: existente}
	uc := NewSetUniformeUseCase(atletas, uniformes)

	u, err := uc.Execute(context.Background(), SetUniformeInput{
		AtletaID: atletaID, TamCamisa: "GG", TamShort: "GG", TamChuteira: "42",
	})

	require.NoError(t, err)
	assert.Same(t, existente, u, "deve atualizar a mesma instância existente, não criar uma nova")
	assert.Equal(t, "GG", u.TamCamisa)
	assert.Equal(t, "42", u.TamChuteira)
	assert.Same(t, existente, uniformes.savedU)
}

func TestSetUniformeUseCase_Execute_AtletaNaoEncontrado(t *testing.T) {
	atletas := &fakeAtletaRepo{byID: nil}
	uc := NewSetUniformeUseCase(atletas, &fakeUniformeRepo{})

	u, err := uc.Execute(context.Background(), SetUniformeInput{
		AtletaID: uuid.New(), TamCamisa: "M", TamShort: "G", TamChuteira: "40",
	})

	assert.Nil(t, u)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrNotFound)
}

func TestSetUniformeUseCase_Execute_ErroAoBuscarAtleta(t *testing.T) {
	buscarErr := errors.New("timeout")
	atletas := &fakeAtletaRepo{errByID: buscarErr}
	uc := NewSetUniformeUseCase(atletas, &fakeUniformeRepo{})

	u, err := uc.Execute(context.Background(), SetUniformeInput{
		AtletaID: uuid.New(), TamCamisa: "M", TamShort: "G", TamChuteira: "40",
	})

	assert.Nil(t, u)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestSetUniformeUseCase_Execute_ErroAoBuscarUniformeAtual(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	buscarErr := errors.New("timeout")
	uniformes := &fakeUniformeRepo{errByAtleta: buscarErr}
	uc := NewSetUniformeUseCase(atletas, uniformes)

	u, err := uc.Execute(context.Background(), SetUniformeInput{
		AtletaID: atletaID, TamCamisa: "M", TamShort: "G", TamChuteira: "40",
	})

	assert.Nil(t, u)
	require.Error(t, err)
	assert.ErrorIs(t, err, buscarErr)
}

func TestSetUniformeUseCase_Execute_TamanhoVazioAoCriar(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	uc := NewSetUniformeUseCase(atletas, &fakeUniformeRepo{})

	u, err := uc.Execute(context.Background(), SetUniformeInput{AtletaID: atletaID, TamCamisa: "", TamShort: "G", TamChuteira: "40"})

	assert.Nil(t, u)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
}

func TestSetUniformeUseCase_Execute_TamanhoVazioAoAtualizar(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	existente := &domainatleta.Uniforme{ID: uuid.New(), AtletaID: atletaID, TamCamisa: "P", TamShort: "P", TamChuteira: "38"}
	uniformes := &fakeUniformeRepo{byAtleta: existente}
	uc := NewSetUniformeUseCase(atletas, uniformes)

	u, err := uc.Execute(context.Background(), SetUniformeInput{AtletaID: atletaID, TamCamisa: "", TamShort: "G", TamChuteira: "40"})

	assert.Nil(t, u)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrDomainViolation)
	assert.Nil(t, uniformes.savedU)
}

func TestSetUniformeUseCase_Execute_ErroAoSalvarNovo(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	saveErr := errors.New("conflito de escrita")
	uniformes := &fakeUniformeRepo{errSave: saveErr}
	uc := NewSetUniformeUseCase(atletas, uniformes)

	u, err := uc.Execute(context.Background(), SetUniformeInput{AtletaID: atletaID, TamCamisa: "M", TamShort: "G", TamChuteira: "40"})

	assert.Nil(t, u)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}

func TestSetUniformeUseCase_Execute_ErroAoSalvarExistente(t *testing.T) {
	atletaID := uuid.New()
	atletas := &fakeAtletaRepo{byID: &domainatleta.Atleta{ID: atletaID}}
	existente := &domainatleta.Uniforme{ID: uuid.New(), AtletaID: atletaID, TamCamisa: "P", TamShort: "P", TamChuteira: "38"}
	saveErr := errors.New("conflito de escrita")
	uniformes := &fakeUniformeRepo{byAtleta: existente, errSave: saveErr}
	uc := NewSetUniformeUseCase(atletas, uniformes)

	u, err := uc.Execute(context.Background(), SetUniformeInput{AtletaID: atletaID, TamCamisa: "M", TamShort: "G", TamChuteira: "40"})

	assert.Nil(t, u)
	require.Error(t, err)
	assert.ErrorIs(t, err, saveErr)
}
