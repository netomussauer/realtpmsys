// Package identidade contém os casos de uso do contexto Identidade.
package identidade

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"golang.org/x/crypto/bcrypt"
)

// Tipos de token emitidos. Diferencia access (curta duração, usado nas chamadas
// /api/v1/*) de refresh (longa duração, usado apenas em /auth/refresh).
const (
	tokenTypeAccess  = "access"
	tokenTypeRefresh = "refresh"
)

// refreshReuseGrace é a janela em que reapresentar um refresh token já
// rotacionado é tratado como corrida entre duas requisições legítimas (ex.: o
// BFF renovando em paralelo) e apenas recusado. Fora dela, o reuso é tratado
// como roubo de token e a família inteira é revogada.
const refreshReuseGrace = 10 * time.Second

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────────────────────

type LoginInput struct {
	Email string
	Senha string
}

// LoginOutput carrega o par de tokens emitido após autenticação.
//
// O access token é stateless (vale até expirar). O refresh token é persistido
// (hash), rotativo e revogável — ver RefreshTokenUseCase.
type LoginOutput struct {
	AccessToken      string
	RefreshToken     string
	AccessExpiresAt  time.Time
	RefreshExpiresAt time.Time
	UserID           uuid.UUID
	Perfil           identidade.Perfil
	// DeveTrocarSenha indica senha temporária: o cliente deve levar o usuário
	// à troca de senha antes de qualquer outra tela.
	DeveTrocarSenha bool
}

type LoginUseCase struct {
	usuarios           identidade.Repository
	tokens             identidade.RefreshTokenRepository
	jwtSecret          []byte
	accessExpiresMins  int
	refreshExpiresDays int
}

func NewLoginUseCase(usuarios identidade.Repository, tokens identidade.RefreshTokenRepository, jwtSecret string, accessExpiresMins, refreshExpiresDays int) *LoginUseCase {
	return &LoginUseCase{
		usuarios:           usuarios,
		tokens:             tokens,
		jwtSecret:          []byte(jwtSecret),
		accessExpiresMins:  accessExpiresMins,
		refreshExpiresDays: refreshExpiresDays,
	}
}

func (uc *LoginUseCase) Execute(ctx context.Context, in LoginInput) (*LoginOutput, error) {
	usuario, err := uc.usuarios.GetByEmail(ctx, in.Email)
	if err != nil {
		return nil, fmt.Errorf("buscar usuário: %w", err)
	}
	// Sem oráculo de enumeração: o bcrypt SEMPRE roda (contra um hash fictício
	// quando o e-mail não existe) e a resposta só distingue "conta inativa" de
	// quem provou saber a senha. Para qualquer outro caso — e-mail inexistente
	// ou senha errada, ativo ou não — a resposta e o tempo são os mesmos.
	hash := hashFicticio()
	if usuario != nil {
		hash = usuario.SenhaHash
	}
	senhaOK := bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Senha)) == nil
	if usuario == nil || !senhaOK {
		return nil, shared.ErrCredenciaisInvalidas
	}
	if !usuario.Ativo {
		return nil, shared.ErrUsuarioInativo
	}

	accessExp := time.Now().Add(time.Duration(uc.accessExpiresMins) * time.Minute)
	access, err := emitirAccess(uc.jwtSecret, usuario, accessExp)
	if err != nil {
		return nil, err
	}

	// Novo login = nova família de refresh tokens.
	refreshExp := time.Now().Add(time.Duration(uc.refreshExpiresDays) * 24 * time.Hour)
	refresh, err := emitirEPersistirRefresh(ctx, uc.tokens, uc.jwtSecret, usuario, uuid.New(), refreshExp)
	if err != nil {
		return nil, err
	}

	return &LoginOutput{
		AccessToken:      access,
		RefreshToken:     refresh,
		AccessExpiresAt:  accessExp,
		RefreshExpiresAt: refreshExp,
		UserID:           usuario.ID,
		Perfil:           usuario.Perfil,
		DeveTrocarSenha:  usuario.DeveTrocarSenha,
	}, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// REFRESH (rotativo)
// ─────────────────────────────────────────────────────────────────────────────

type RefreshTokenInput struct {
	RefreshToken string
}

// RefreshTokenOutput carrega o novo par de tokens. O refresh apresentado é
// consumido: só o novo continua válido. A expiração absoluta da sessão não
// é estendida pela rotação (RefreshExpiresAt = a do login original).
type RefreshTokenOutput struct {
	AccessToken      string
	RefreshToken     string
	AccessExpiresAt  time.Time
	RefreshExpiresAt time.Time
	UserID           uuid.UUID
	Perfil           identidade.Perfil
	DeveTrocarSenha  bool
}

type RefreshTokenUseCase struct {
	usuarios          identidade.Repository
	tokens            identidade.RefreshTokenRepository
	jwtSecret         []byte
	accessExpiresMins int
}

func NewRefreshTokenUseCase(usuarios identidade.Repository, tokens identidade.RefreshTokenRepository, jwtSecret string, accessExpiresMins int) *RefreshTokenUseCase {
	return &RefreshTokenUseCase{
		usuarios:          usuarios,
		tokens:            tokens,
		jwtSecret:         []byte(jwtSecret),
		accessExpiresMins: accessExpiresMins,
	}
}

func (uc *RefreshTokenUseCase) Execute(ctx context.Context, in RefreshTokenInput) (*RefreshTokenOutput, error) {
	if in.RefreshToken == "" {
		return nil, shared.ErrCredenciaisInvalidas
	}

	claims := jwt.MapClaims{}
	token, err := jwt.ParseWithClaims(in.RefreshToken, claims, func(t *jwt.Token) (any, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrSignatureInvalid
		}
		return uc.jwtSecret, nil
	})
	if err != nil || !token.Valid {
		return nil, shared.ErrCredenciaisInvalidas
	}

	// Rejeita access token usado como refresh — só aceita typ=refresh.
	if typ, _ := claims["typ"].(string); typ != tokenTypeRefresh {
		return nil, shared.ErrCredenciaisInvalidas
	}

	// O token precisa existir no banco: assinatura válida não basta. Isso
	// também invalida refresh tokens emitidos antes da persistência existir.
	registro, err := uc.tokens.GetByHash(ctx, HashRefreshToken(in.RefreshToken))
	if err != nil {
		return nil, fmt.Errorf("buscar refresh token: %w", err)
	}
	if registro == nil {
		return nil, shared.ErrCredenciaisInvalidas
	}

	// Token já consumido/revogado. Reuso fora da janela de corrida sugere que
	// alguém copiou o token: derruba a cadeia inteira (legítimo e atacante).
	if registro.RevogadoEm != nil {
		if time.Since(*registro.RevogadoEm) > refreshReuseGrace {
			if err := uc.tokens.RevogarFamilia(ctx, registro.FamiliaID); err != nil {
				return nil, fmt.Errorf("revogar família: %w", err)
			}
		}
		return nil, shared.ErrCredenciaisInvalidas
	}
	if !registro.ExpiraEm.After(time.Now()) {
		return nil, shared.ErrCredenciaisInvalidas
	}

	usuario, err := uc.usuarios.GetByID(ctx, registro.UsuarioID)
	if err != nil {
		return nil, fmt.Errorf("buscar usuário: %w", err)
	}
	if usuario == nil {
		// Token válido mas usuário sumiu — credencial inválida.
		return nil, shared.ErrCredenciaisInvalidas
	}
	if !usuario.Ativo {
		if err := uc.tokens.RevogarFamilia(ctx, registro.FamiliaID); err != nil {
			return nil, fmt.Errorf("revogar família: %w", err)
		}
		return nil, shared.ErrUsuarioInativo
	}

	accessExp := time.Now().Add(time.Duration(uc.accessExpiresMins) * time.Minute)
	access, err := emitirAccess(uc.jwtSecret, usuario, accessExp)
	if err != nil {
		return nil, err
	}

	// Consome o token ANTES de emitir o filho, de forma atômica (UPDATE ...
	// WHERE revogado_em IS NULL). Das requisições concorrentes com o mesmo
	// refresh token, só UMA recebe `consumido=true`; as demais perdem a corrida
	// e são recusadas (o equivalente a um reuso dentro da janela de tolerância:
	// o vencedor acabou de revogar o token). Isso impede que a cadeia bifurque
	// em dois filhos válidos — o que esconderia o roubo da detecção de reuso.
	//
	// Trade-off: se a emissão do filho falhar depois deste ponto, o token já
	// foi consumido e o usuário precisa entrar de novo. Falhar fechado é
	// preferível a uma cadeia bifurcada.
	consumido, err := uc.tokens.RevogarSeAtivo(ctx, registro.ID)
	if err != nil {
		return nil, fmt.Errorf("consumir refresh token: %w", err)
	}
	if !consumido {
		return nil, shared.ErrCredenciaisInvalidas
	}
	novoRefresh, err := emitirEPersistirRefresh(ctx, uc.tokens, uc.jwtSecret, usuario, registro.FamiliaID, registro.ExpiraEm)
	if err != nil {
		return nil, err
	}

	return &RefreshTokenOutput{
		AccessToken:      access,
		RefreshToken:     novoRefresh,
		AccessExpiresAt:  accessExp,
		RefreshExpiresAt: registro.ExpiraEm,
		UserID:           usuario.ID,
		Perfil:           usuario.Perfil,
		DeveTrocarSenha:  usuario.DeveTrocarSenha,
	}, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGOUT
// ─────────────────────────────────────────────────────────────────────────────

type LogoutUseCase struct {
	tokens identidade.RefreshTokenRepository
}

func NewLogoutUseCase(tokens identidade.RefreshTokenRepository) *LogoutUseCase {
	return &LogoutUseCase{tokens: tokens}
}

// Execute revoga a família do refresh token informado. É idempotente e não
// revela se o token existia: token desconhecido também é sucesso.
func (uc *LogoutUseCase) Execute(ctx context.Context, refreshToken string) error {
	if refreshToken == "" {
		return nil
	}
	registro, err := uc.tokens.GetByHash(ctx, HashRefreshToken(refreshToken))
	if err != nil {
		return fmt.Errorf("buscar refresh token: %w", err)
	}
	if registro == nil {
		return nil
	}
	if err := uc.tokens.RevogarFamilia(ctx, registro.FamiliaID); err != nil {
		return fmt.Errorf("revogar família: %w", err)
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

// emitirAccess assina o access token. Quando o usuário tem senha temporária,
// o claim `dts` faz o middleware de Auth bloquear tudo, exceto a troca de senha.
func emitirAccess(secret []byte, u *identidade.Usuario, expiresAt time.Time) (string, error) {
	if u != nil && u.DeveTrocarSenha {
		return emitirToken(secret, u, tokenTypeAccess, expiresAt, map[string]any{"dts": true})
	}
	return emitirToken(secret, u, tokenTypeAccess, expiresAt)
}

// emitirEPersistirRefresh assina um refresh token (com `jti` = id do registro e
// `fam` = família) e persiste apenas o hash dele.
func emitirEPersistirRefresh(
	ctx context.Context,
	repo identidade.RefreshTokenRepository,
	secret []byte,
	u *identidade.Usuario,
	familiaID uuid.UUID,
	expiresAt time.Time,
) (string, error) {
	id := uuid.New()
	tk, err := emitirToken(secret, u, tokenTypeRefresh, expiresAt, map[string]any{
		"jti": id.String(),
		"fam": familiaID.String(),
	})
	if err != nil {
		return "", err
	}
	err = repo.Save(ctx, &identidade.RefreshToken{
		ID:        id,
		UsuarioID: u.ID,
		FamiliaID: familiaID,
		TokenHash: HashRefreshToken(tk),
		ExpiraEm:  expiresAt.UTC(),
		CriadoEm:  time.Now().UTC(),
	})
	if err != nil {
		return "", fmt.Errorf("persistir refresh token: %w", err)
	}
	return tk, nil
}

// emitirToken assina um JWT HS256 com claim `typ` para diferenciar access de refresh.
// O middleware de Auth deve rejeitar tokens com `typ != access`.
func emitirToken(secret []byte, u *identidade.Usuario, typ string, expiresAt time.Time, extra ...map[string]any) (string, error) {
	if u == nil {
		return "", errors.New("usuário nulo")
	}
	claims := jwt.MapClaims{
		"user_id": u.ID.String(),
		"perfil":  string(u.Perfil),
		"typ":     typ,
		"exp":     expiresAt.Unix(),
		"iat":     time.Now().Unix(),
		"sub":     u.ID.String(),
	}
	for _, m := range extra {
		for k, v := range m {
			claims[k] = v
		}
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(secret)
	if err != nil {
		return "", fmt.Errorf("assinar token: %w", err)
	}
	return signed, nil
}

var (
	hashFicticioOnce  sync.Once
	hashFicticioValor string
)

// hashFicticio é um hash bcrypt (no custo vigente) de uma senha que ninguém
// conhece, usado para igualar o tempo de login quando o e-mail não existe.
func hashFicticio() string {
	hashFicticioOnce.Do(func() {
		h, err := bcrypt.GenerateFromPassword([]byte(uuid.NewString()), bcryptCost)
		if err != nil {
			// Falha só se o custo for inválido; um hash inválido ainda gasta
			// tempo de CompareHashAndPassword mínimo, mas não quebra o login.
			h = []byte("$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidi")
		}
		hashFicticioValor = string(h)
	})
	return hashFicticioValor
}
