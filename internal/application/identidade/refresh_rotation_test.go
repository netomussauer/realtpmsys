package identidade

import (
	"context"
	"testing"
	"time"

	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestLogin_PersisteRefreshTokenApenasPorHash(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "senha-correta")
	tokens := newFakeTokens()
	uc := NewLoginUseCase(&fakeUsuarioRepo{usuarioByEmail: usuario}, tokens, testSecret, 30, 7)

	out, err := uc.Execute(context.Background(), LoginInput{Email: "user@example.com", Senha: "senha-correta"})
	require.NoError(t, err)

	require.Len(t, tokens.porHash, 1)
	reg := tokens.porHash[HashRefreshToken(out.RefreshToken)]
	require.NotNil(t, reg, "o registro é indexado pelo hash do token entregue ao cliente")
	assert.Equal(t, usuario.ID, reg.UsuarioID)
	assert.Nil(t, reg.RevogadoEm)
	assert.WithinDuration(t, out.RefreshExpiresAt, reg.ExpiraEm, time.Second)
	assert.NotEqual(t, out.RefreshToken, reg.TokenHash, "o token em texto puro nunca é guardado")

	claims := parseToken(t, out.RefreshToken)
	assert.Equal(t, reg.ID.String(), claims["jti"])
	assert.Equal(t, reg.FamiliaID.String(), claims["fam"])
}

func TestLogin_CadaLoginAbreNovaFamilia(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "senha-correta")
	tokens := newFakeTokens()
	uc := NewLoginUseCase(&fakeUsuarioRepo{usuarioByEmail: usuario}, tokens, testSecret, 30, 7)

	a, err := uc.Execute(context.Background(), LoginInput{Email: "user@example.com", Senha: "senha-correta"})
	require.NoError(t, err)
	b, err := uc.Execute(context.Background(), LoginInput{Email: "user@example.com", Senha: "senha-correta"})
	require.NoError(t, err)

	fa := tokens.porHash[HashRefreshToken(a.RefreshToken)].FamiliaID
	fb := tokens.porHash[HashRefreshToken(b.RefreshToken)].FamiliaID
	assert.NotEqual(t, fa, fb)
}

func TestLogin_FlagDeTrocarSenhaVaiNoClaimEMesmoNaResposta(t *testing.T) {
	t.Run("senha temporária", func(t *testing.T) {
		usuario := novoUsuarioComSenha(t, "temp")
		usuario.DeveTrocarSenha = true
		uc := NewLoginUseCase(&fakeUsuarioRepo{usuarioByEmail: usuario}, newFakeTokens(), testSecret, 30, 7)

		out, err := uc.Execute(context.Background(), LoginInput{Email: "user@example.com", Senha: "temp"})
		require.NoError(t, err)
		assert.True(t, out.DeveTrocarSenha)
		assert.Equal(t, true, parseToken(t, out.AccessToken)["dts"])
		assert.NotContains(t, parseToken(t, out.RefreshToken), "dts", "o refresh não carrega a flag")
	})
	t.Run("senha normal", func(t *testing.T) {
		usuario := novoUsuarioComSenha(t, "normal")
		uc := NewLoginUseCase(&fakeUsuarioRepo{usuarioByEmail: usuario}, newFakeTokens(), testSecret, 30, 7)

		out, err := uc.Execute(context.Background(), LoginInput{Email: "user@example.com", Senha: "normal"})
		require.NoError(t, err)
		assert.False(t, out.DeveTrocarSenha)
		assert.NotContains(t, parseToken(t, out.AccessToken), "dts")
	})
}

func TestRefresh_RotacionaEConsomeOTokenAnterior(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	tokens := newFakeTokens()
	exp := time.Now().Add(48 * time.Hour)
	antigo := refreshParaTeste(t, tokens, usuario, exp)
	famAntiga := tokens.porHash[HashRefreshToken(antigo)].FamiliaID

	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{usuarioByID: usuario}, tokens, testSecret, 30)
	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: antigo})
	require.NoError(t, err)

	assert.NotEmpty(t, out.RefreshToken)
	assert.NotEqual(t, antigo, out.RefreshToken)
	assert.WithinDuration(t, exp, out.RefreshExpiresAt, time.Second, "a rotação não estende a sessão")

	novo := tokens.porHash[HashRefreshToken(out.RefreshToken)]
	require.NotNil(t, novo)
	assert.Equal(t, famAntiga, novo.FamiliaID, "mesma família")
	assert.Nil(t, novo.RevogadoEm)
	assert.NotNil(t, tokens.porHash[HashRefreshToken(antigo)].RevogadoEm, "o anterior é consumido")

	// O novo token segue funcionando.
	_, err = uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: out.RefreshToken})
	assert.NoError(t, err)
}

func TestRefresh_ReusoForaDaJanelaRevogaAFamilia(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	tokens := newFakeTokens()
	antigo := refreshParaTeste(t, tokens, usuario, time.Now().Add(time.Hour))
	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{usuarioByID: usuario}, tokens, testSecret, 30)

	rot, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: antigo})
	require.NoError(t, err)

	// Simula que a rotação aconteceu há 1 minuto.
	atras := time.Now().Add(-time.Minute)
	tokens.porHash[HashRefreshToken(antigo)].RevogadoEm = &atras

	_, err = uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: antigo})
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)

	// A família inteira caiu: o token novo, antes válido, também foi revogado.
	assert.NotNil(t, tokens.porHash[HashRefreshToken(rot.RefreshToken)].RevogadoEm)
	_, err = uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: rot.RefreshToken})
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestRefresh_ReusoDentroDaJanelaNaoDerrubaASessao(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	tokens := newFakeTokens()
	antigo := refreshParaTeste(t, tokens, usuario, time.Now().Add(time.Hour))
	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{usuarioByID: usuario}, tokens, testSecret, 30)

	rot, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: antigo})
	require.NoError(t, err)

	// Segunda requisição concorrente com o mesmo token, logo em seguida.
	_, err = uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: antigo})
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)

	assert.Nil(t, tokens.porHash[HashRefreshToken(rot.RefreshToken)].RevogadoEm, "a sessão da requisição vencedora segue ativa")
	_, err = uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: rot.RefreshToken})
	assert.NoError(t, err)
}

func TestRefresh_TokenAssinadoMasNaoPersistidoEhRecusado(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	// Assinatura e typ corretos, mas nunca passou pelo Login (ex.: emitido
	// antes da persistência existir, ou forjado com o segredo vazado).
	solto := emitirParaTeste(t, testSecret, usuario, tokenTypeRefresh, time.Now().Add(time.Hour))

	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{usuarioByID: usuario}, newFakeTokens(), testSecret, 30)
	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: solto})
	assert.Nil(t, out)
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestRefresh_RegistroExpiradoNoBancoEhRecusado(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	tokens := newFakeTokens()
	tk := refreshParaTeste(t, tokens, usuario, time.Now().Add(time.Hour))
	tokens.porHash[HashRefreshToken(tk)].ExpiraEm = time.Now().Add(-time.Second)

	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{usuarioByID: usuario}, tokens, testSecret, 30)
	_, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: tk})
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestRefresh_UsuarioInativoRevogaAFamilia(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	usuario.Ativo = false
	tokens := newFakeTokens()
	tk := refreshParaTeste(t, tokens, usuario, time.Now().Add(time.Hour))

	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{usuarioByID: usuario}, tokens, testSecret, 30)
	_, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: tk})
	assert.ErrorIs(t, err, shared.ErrUsuarioInativo)
	assert.NotNil(t, tokens.porHash[HashRefreshToken(tk)].RevogadoEm)
}

func TestRefresh_PropagaFlagDeTrocarSenha(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	usuario.DeveTrocarSenha = true
	tokens := newFakeTokens()
	tk := refreshParaTeste(t, tokens, usuario, time.Now().Add(time.Hour))

	uc := NewRefreshTokenUseCase(&fakeUsuarioRepo{usuarioByID: usuario}, tokens, testSecret, 30)
	out, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: tk})
	require.NoError(t, err)
	assert.True(t, out.DeveTrocarSenha)
	assert.Equal(t, true, parseToken(t, out.AccessToken)["dts"])

	// Depois da troca de senha, o próximo refresh emite access sem a trava.
	usuario.DeveTrocarSenha = false
	out2, err := uc.Execute(context.Background(), RefreshTokenInput{RefreshToken: out.RefreshToken})
	require.NoError(t, err)
	assert.False(t, out2.DeveTrocarSenha)
	assert.NotContains(t, parseToken(t, out2.AccessToken), "dts")
}

func TestLogout(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	tokens := newFakeTokens()
	tk := refreshParaTeste(t, tokens, usuario, time.Now().Add(time.Hour))
	uc := NewLogoutUseCase(tokens)

	require.NoError(t, uc.Execute(context.Background(), tk))
	assert.NotNil(t, tokens.porHash[HashRefreshToken(tk)].RevogadoEm)

	// Idempotente e sem vazar existência.
	assert.NoError(t, uc.Execute(context.Background(), tk))
	assert.NoError(t, uc.Execute(context.Background(), "token-desconhecido"))
	assert.NoError(t, uc.Execute(context.Background(), ""))

	// Depois do logout o refresh não renova mais.
	rf := NewRefreshTokenUseCase(&fakeUsuarioRepo{usuarioByID: usuario}, tokens, testSecret, 30)
	_, err := rf.Execute(context.Background(), RefreshTokenInput{RefreshToken: tk})
	assert.ErrorIs(t, err, shared.ErrCredenciaisInvalidas)
}

func TestLogout_RevogaSoAFamiliaDoToken(t *testing.T) {
	usuario := novoUsuarioComSenha(t, "x")
	tokens := newFakeTokens()
	a := refreshParaTeste(t, tokens, usuario, time.Now().Add(time.Hour))
	b := refreshParaTeste(t, tokens, usuario, time.Now().Add(time.Hour)) // outra família (outro login)
	require.NotEqual(t, tokens.porHash[HashRefreshToken(a)].FamiliaID, tokens.porHash[HashRefreshToken(b)].FamiliaID)

	require.NoError(t, NewLogoutUseCase(tokens).Execute(context.Background(), a))
	assert.NotNil(t, tokens.porHash[HashRefreshToken(a)].RevogadoEm)
	assert.Nil(t, tokens.porHash[HashRefreshToken(b)].RevogadoEm, "outro dispositivo continua logado")
}
