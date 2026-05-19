package identidade

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

const testSecret = "test-secret-da-suite-de-testes-de-identidade"

// fakeUsuarioRepo é um stub do identidade.Repository com respostas configuráveis.
type fakeUsuarioRepo struct {
	usuarioByEmail *identidade.Usuario
	errByEmail     error
	usuarioByID    *identidade.Usuario
	errByID        error

	gotEmail string
	gotID    uuid.UUID
}

func (f *fakeUsuarioRepo) GetByEmail(_ context.Context, email string) (*identidade.Usuario, error) {
	f.gotEmail = email
	return f.usuarioByEmail, f.errByEmail
}

func (f *fakeUsuarioRepo) GetByID(_ context.Context, id uuid.UUID) (*identidade.Usuario, error) {
	f.gotID = id
	return f.usuarioByID, f.errByID
}

func novoUsuarioComSenha(t *testing.T, senha string) *identidade.Usuario {
	t.Helper()
	hash, err := bcrypt.GenerateFromPassword([]byte(senha), bcrypt.MinCost)
	require.NoError(t, err)
	return &identidade.Usuario{
		ID:        uuid.New(),
		Email:     "user@example.com",
		SenhaHash: string(hash),
		Perfil:    identidade.PerfilAdmin,
		Ativo:     true,
	}
}

// parseToken decodifica um JWT assinado com testSecret e devolve as claims.
func parseToken(t *testing.T, token string) jwt.MapClaims {
	t.Helper()
	claims := jwt.MapClaims{}
	parsed, err := jwt.ParseWithClaims(token, claims, func(*jwt.Token) (any, error) {
		return []byte(testSecret), nil
	})
	require.NoError(t, err)
	require.True(t, parsed.Valid)
	return claims
}

// ─────────────────────────────────────────────────────────────────────────────
// LoginUseCase
// ─────────────────────────────────────────────────────────────────────────────

func TestLoginUseCase_Execute_Sucesso(t *testing.T) {
	ctx := context.Background()
	usuario := novoUsuarioComSenha(t, "senha-correta")
	repo := &fakeUsuarioRepo{usuarioByEmail: usuario}

	uc := NewLoginUseCase(repo, testSecret, 30, 7)
	out, err := uc.Execute(ctx, LoginInput{Email: "user@example.com", Senha: "senha-correta"})

	require.NoError(t, err)
	require.NotNil(t, out)

	assert.Equal(t, "user@example.com", repo.gotEmail)
	assert.Equal(t, usuario.ID, out.UserID)
	assert.Equal(t, identidade.PerfilAdmin, out.Perfil)

	assert.NotEmpty(t, out.AccessToken)
	assert.NotEmpty(t, out.RefreshToken)
	assert.NotEqual(t, out.AccessToken, out.RefreshToken, "access e refresh devem ser tokens distintos")

	// Access token: typ=access e expira em ~30min
	accessClaims := parseToken(t, out.AccessToken)
	assert.Equal(t, tokenTypeAccess, accessClaims["typ"])
	assert.Equal(t, usuario.ID.String(), accessClaims["user_id"])
	assert.Equal(t, string(identidade.PerfilAdmin), accessClaims["perfil"])
	assert.WithinDuration(t, time.Now().Add(30*time.Minute), out.AccessExpiresAt, 5*time.Second)

	// Refresh token: typ=refresh e expira em ~7 dias
	refreshClaims := parseToken(t, out.RefreshToken)
	assert.Equal(t, tokenTypeRefresh, refreshClaims["typ"])
	assert.WithinDuration(t, time.Now().Add(7*24*time.Hour), out.RefreshExpiresAt, 5*time.Second)
}

func TestLoginUseCase_Execute_UsuarioNaoEncontrado(t *testing.T) {
	repo := &fakeUsuarioRepo{usuarioByEmail: nil}
	uc := NewLoginUseCase(repo, testSecret, 30, 7)

	out, err := uc.Execute(context.Background(), LoginInput{Email: "ghost@example.com", Senha: "qualquer"})

	assert.Nil(t, out)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestLoginUseCase_Execute_UsuarioInativo(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "senha")
	usuario.Ativo = false
	repo := &fakeUsuarioRepo{usuarioByEmail: usuario}
	uc := NewLoginUseCase(repo, testSecret, 30, 7)

	out, err := uc.Execute(context.Background(), LoginInput{Email: "user@example.com", Senha: "senha"})

	assert.Nil(t, out)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrUsuarioInativo)
}

func TestLoginUseCase_Execute_SenhaInvalida(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "senha-correta")
	repo := &fakeUsuarioRepo{usuarioByEmail: usuario}
	uc := NewLoginUseCase(repo, testSecret, 30, 7)

	out, err := uc.Execute(context.Background(), LoginInput{Email: "user@example.com", Senha: "senha-errada"})

	assert.Nil(t, out)
	require.Error(t, err)
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestLoginUseCase_Execute_ErroNoRepositorio(t *testing.T) {
	repoErr := errors.New("conexão perdida")
	repo := &fakeUsuarioRepo{errByEmail: repoErr}
	uc := NewLoginUseCase(repo, testSecret, 30, 7)

	out, err := uc.Execute(context.Background(), LoginInput{Email: "user@example.com", Senha: "senha"})

	assert.Nil(t, out)
	require.Error(t, err)
	// Erro técnico é embrulhado com fmt.Errorf — preserva o original via errors.Is.
	assert.ErrorIs(t, err, repoErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// RefreshTokenUseCase
// ─────────────────────────────────────────────────────────────────────────────

// emitirParaTeste é um helper que gera tokens diretamente (sem passar pelo Login)
// para isolar o RefreshTokenUseCase de mudanças no LoginUseCase.
func emitirParaTeste(t *testing.T, secret string, u *identidade.Usuario, typ string, exp time.Time) string {
	t.Helper()
	tk, err := emitirToken([]byte(secret), u, typ, exp)
	require.NoError(t, err)
	return tk
}

func TestRefreshTokenUseCase_Execute_Sucesso(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	refresh := emitirParaTeste(t, testSecret, usuario, tokenTypeRefresh, time.Now().Add(time.Hour))

	repo := &fakeUsuarioRepo{usuarioByID: usuario}
	uc := NewRefreshTokenUseCase(repo, testSecret, 30)

	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: refresh})

	require.NoError(t, err)
	require.NotNil(t, out)
	assert.Equal(t, usuario.ID, repo.gotID)
	assert.Equal(t, usuario.ID, out.UserID)
	assert.Equal(t, identidade.PerfilAdmin, out.Perfil)
	assert.NotEmpty(t, out.AccessToken)

	claims := parseToken(t, out.AccessToken)
	assert.Equal(t, tokenTypeAccess, claims["typ"], "RefreshTokenUseCase deve emitir um access token")
	assert.WithinDuration(t, time.Now().Add(30*time.Minute), out.AccessExpiresAt, 5*time.Second)
}

func TestRefreshTokenUseCase_Execute_TokenVazio(t *testing.T) {
	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{}, testSecret, 30)

	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: ""})

	assert.Nil(t, out)
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestRefreshTokenUseCase_Execute_TokenInvalido(t *testing.T) {
	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{}, testSecret, 30)

	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: "isto-nao-eh-um-jwt"})

	assert.Nil(t, out)
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestRefreshTokenUseCase_Execute_TokenAssinadoComOutroSegredo(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	tokenAlheio := emitirParaTeste(t, "outro-segredo", usuario, tokenTypeRefresh, time.Now().Add(time.Hour))

	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{}, testSecret, 30)
	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: tokenAlheio})

	assert.Nil(t, out)
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestRefreshTokenUseCase_Execute_AccessTokenNaoServeComoRefresh(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	// Token com typ=access — RefreshTokenUseCase deve rejeitar.
	access := emitirParaTeste(t, testSecret, usuario, tokenTypeAccess, time.Now().Add(time.Hour))

	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{}, testSecret, 30)
	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: access})

	assert.Nil(t, out)
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestRefreshTokenUseCase_Execute_TokenExpirado(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	expirado := emitirParaTeste(t, testSecret, usuario, tokenTypeRefresh, time.Now().Add(-time.Hour))

	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{usuarioByID: usuario}, testSecret, 30)
	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: expirado})

	assert.Nil(t, out)
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestRefreshTokenUseCase_Execute_UsuarioSumiuDoBanco(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	refresh := emitirParaTeste(t, testSecret, usuario, tokenTypeRefresh, time.Now().Add(time.Hour))

	repo := &fakeUsuarioRepo{usuarioByID: nil} // GetByID devolve nil sem erro
	uc := NewRefreshTokenUseCase(repo, testSecret, 30)

	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: refresh})

	assert.Nil(t, out)
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestRefreshTokenUseCase_Execute_UsuarioInativo(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	usuario.Ativo = false
	refresh := emitirParaTeste(t, testSecret, usuario, tokenTypeRefresh, time.Now().Add(time.Hour))

	repo := &fakeUsuarioRepo{usuarioByID: usuario}
	uc := NewRefreshTokenUseCase(repo, testSecret, 30)

	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: refresh})

	assert.Nil(t, out)
	assert.ErrorIs(t, err, shared.ErrUsuarioInativo)
}

func TestRefreshTokenUseCase_Execute_ErroNoRepositorio(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	refresh := emitirParaTeste(t, testSecret, usuario, tokenTypeRefresh, time.Now().Add(time.Hour))

	repoErr := errors.New("db caiu")
	repo := &fakeUsuarioRepo{errByID: repoErr}
	uc := NewRefreshTokenUseCase(repo, testSecret, 30)

	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: refresh})

	assert.Nil(t, out)
	require.Error(t, err)
	assert.ErrorIs(t, err, repoErr)
}

// ─────────────────────────────────────────────────────────────────────────────
// emitirToken (helper interno)
// ─────────────────────────────────────────────────────────────────────────────

func TestEmitirToken_UsuarioNulo(t *testing.T) {
	tk, err := emitirToken([]byte(testSecret), nil, tokenTypeAccess, time.Now().Add(time.Hour))
	assert.Empty(t, tk)
	require.Error(t, err)
}

func TestEmitirToken_ClaimsPadrao(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	exp := time.Now().Add(15 * time.Minute)

	tk, err := emitirToken([]byte(testSecret), usuario, tokenTypeAccess, exp)
	require.NoError(t, err)

	claims := parseToken(t, tk)
	assert.Equal(t, usuario.ID.String(), claims["user_id"])
	assert.Equal(t, usuario.ID.String(), claims["sub"])
	assert.Equal(t, string(usuario.Perfil), claims["perfil"])
	assert.Equal(t, tokenTypeAccess, claims["typ"])
	assert.EqualValues(t, exp.Unix(), int64(claims["exp"].(float64)))
}
