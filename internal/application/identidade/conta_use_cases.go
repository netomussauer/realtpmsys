package identidade

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/google/uuid"
	"github.com/realtpmsys/realtpmsys/internal/domain/identidade"
	"github.com/realtpmsys/realtpmsys/internal/domain/shared"
	"golang.org/x/crypto/bcrypt"
)

// bcryptCost segue o custo dos hashes semeados pelas migrations (12). É var
// apenas para os testes poderem usar bcrypt.MinCost.
var bcryptCost = 12

func hashSenha(senha string) (string, error) {
	h, err := bcrypt.GenerateFromPassword([]byte(senha), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("gerar hash de senha: %w", err)
	}
	return string(h), nil
}

// HashRefreshToken devolve o SHA-256 (hex) de um refresh token. Só o hash é
// persistido — um vazamento do banco não entrega tokens utilizáveis.
func HashRefreshToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

// ─────────────────────────────────────────────────────────────────────────────
// CRIAR USUÁRIO
// ─────────────────────────────────────────────────────────────────────────────

type CriarUsuarioInput struct {
	Email  string
	Nome   string
	Perfil string
}

// CriarUsuarioOutput carrega a senha temporária em texto puro. Ela existe
// apenas nesta resposta: não é persistida nem logada.
type CriarUsuarioOutput struct {
	Usuario         *identidade.Usuario
	SenhaTemporaria string
}

type CriarUsuarioUseCase struct {
	contas identidade.ContaRepository
}

func NewCriarUsuarioUseCase(contas identidade.ContaRepository) *CriarUsuarioUseCase {
	return &CriarUsuarioUseCase{contas: contas}
}

func (uc *CriarUsuarioUseCase) Execute(ctx context.Context, in CriarUsuarioInput) (*CriarUsuarioOutput, error) {
	perfil, err := identidade.ParsePerfil(in.Perfil)
	if err != nil {
		return nil, err
	}
	email, err := identidade.NormalizarEmail(in.Email)
	if err != nil {
		return nil, err
	}

	existente, err := uc.contas.GetByEmail(ctx, email)
	if err != nil {
		return nil, fmt.Errorf("buscar usuário por e-mail: %w", err)
	}
	if existente != nil {
		return nil, shared.ErrEmailEmUso
	}

	senha, err := identidade.GerarSenhaTemporaria()
	if err != nil {
		return nil, fmt.Errorf("gerar senha temporária: %w", err)
	}
	hash, err := hashSenha(senha)
	if err != nil {
		return nil, err
	}

	u, err := identidade.NovoUsuario(email, in.Nome, perfil, hash, true)
	if err != nil {
		return nil, err
	}
	if err := uc.contas.Save(ctx, u); err != nil {
		// ErrEmailEmUso (corrida entre dois cadastros) passa intacto.
		return nil, fmt.Errorf("salvar usuário: %w", err)
	}
	return &CriarUsuarioOutput{Usuario: u, SenhaTemporaria: senha}, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// ATUALIZAR USUÁRIO (nome e perfil)
// ─────────────────────────────────────────────────────────────────────────────

type AtualizarUsuarioInput struct {
	ID     uuid.UUID
	AtorID uuid.UUID
	Nome   *string // nil = não altera
	Perfil *string // nil = não altera
}

type AtualizarUsuarioUseCase struct {
	contas identidade.ContaRepository
	tokens identidade.RefreshTokenRepository
}

func NewAtualizarUsuarioUseCase(contas identidade.ContaRepository, tokens identidade.RefreshTokenRepository) *AtualizarUsuarioUseCase {
	return &AtualizarUsuarioUseCase{contas: contas, tokens: tokens}
}

func (uc *AtualizarUsuarioUseCase) Execute(ctx context.Context, in AtualizarUsuarioInput) (*identidade.Usuario, error) {
	u, err := carregarUsuario(ctx, uc.contas, in.ID)
	if err != nil {
		return nil, err
	}

	perfilMudou := false
	if in.Perfil != nil {
		novo, err := identidade.ParsePerfil(*in.Perfil)
		if err != nil {
			return nil, err
		}
		if novo != u.Perfil {
			if u.Perfil == identidade.PerfilAdmin {
				if err := garantirRebaixamentoSeguro(ctx, uc.contas, u, in.AtorID); err != nil {
					return nil, err
				}
			}
			if err := u.AlterarPerfil(novo); err != nil {
				return nil, err
			}
			perfilMudou = true
		}
	}
	if in.Nome != nil {
		u.AlterarNome(*in.Nome)
	}

	if err := uc.contas.Save(ctx, u); err != nil {
		return nil, fmt.Errorf("salvar usuário: %w", err)
	}
	// O perfil vai dentro do JWT: derruba as sessões para que o novo perfil
	// valha no próximo login em vez de depender de tokens emitidos antes.
	if perfilMudou {
		if err := uc.tokens.RevogarTodosDoUsuario(ctx, u.ID); err != nil {
			return nil, fmt.Errorf("revogar tokens: %w", err)
		}
	}
	return u, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// ATIVAR / DESATIVAR
// ─────────────────────────────────────────────────────────────────────────────

type AlterarStatusUsuarioUseCase struct {
	contas identidade.ContaRepository
	tokens identidade.RefreshTokenRepository
}

func NewAlterarStatusUsuarioUseCase(contas identidade.ContaRepository, tokens identidade.RefreshTokenRepository) *AlterarStatusUsuarioUseCase {
	return &AlterarStatusUsuarioUseCase{contas: contas, tokens: tokens}
}

func (uc *AlterarStatusUsuarioUseCase) Execute(ctx context.Context, id, atorID uuid.UUID, ativar bool) (*identidade.Usuario, error) {
	u, err := carregarUsuario(ctx, uc.contas, id)
	if err != nil {
		return nil, err
	}

	if ativar {
		u.Ativar()
	} else {
		if u.Ativo && u.Perfil == identidade.PerfilAdmin {
			if err := garantirRebaixamentoSeguro(ctx, uc.contas, u, atorID); err != nil {
				return nil, err
			}
		} else if u.ID == atorID {
			return nil, shared.ErrAutoModificacao
		}
		u.Desativar()
	}

	if err := uc.contas.Save(ctx, u); err != nil {
		return nil, fmt.Errorf("salvar usuário: %w", err)
	}
	if !ativar {
		if err := uc.tokens.RevogarTodosDoUsuario(ctx, u.ID); err != nil {
			return nil, fmt.Errorf("revogar tokens: %w", err)
		}
	}
	return u, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// REDEFINIR SENHA (pelo ADMIN)
// ─────────────────────────────────────────────────────────────────────────────

type RedefinirSenhaOutput struct {
	Usuario         *identidade.Usuario
	SenhaTemporaria string
}

type RedefinirSenhaUseCase struct {
	contas identidade.ContaRepository
	tokens identidade.RefreshTokenRepository
}

func NewRedefinirSenhaUseCase(contas identidade.ContaRepository, tokens identidade.RefreshTokenRepository) *RedefinirSenhaUseCase {
	return &RedefinirSenhaUseCase{contas: contas, tokens: tokens}
}

func (uc *RedefinirSenhaUseCase) Execute(ctx context.Context, id, atorID uuid.UUID) (*RedefinirSenhaOutput, error) {
	// Redefinir a própria senha por aqui trancaria o ADMIN com uma senha
	// temporária que ele nunca viu: para isso existe a troca de senha da conta.
	if id == atorID {
		return nil, shared.Newf(shared.ErrAutoModificacao, "use a troca de senha da própria conta")
	}
	u, err := carregarUsuario(ctx, uc.contas, id)
	if err != nil {
		return nil, err
	}

	senha, err := identidade.GerarSenhaTemporaria()
	if err != nil {
		return nil, fmt.Errorf("gerar senha temporária: %w", err)
	}
	hash, err := hashSenha(senha)
	if err != nil {
		return nil, err
	}
	u.DefinirSenha(hash, true)

	if err := uc.contas.Save(ctx, u); err != nil {
		return nil, fmt.Errorf("salvar usuário: %w", err)
	}
	if err := uc.tokens.RevogarTodosDoUsuario(ctx, u.ID); err != nil {
		return nil, fmt.Errorf("revogar tokens: %w", err)
	}
	return &RedefinirSenhaOutput{Usuario: u, SenhaTemporaria: senha}, nil
}

// ─────────────────────────────────────────────────────────────────────────────
// ALTERAR A PRÓPRIA SENHA
// ─────────────────────────────────────────────────────────────────────────────

type AlterarMinhaSenhaInput struct {
	UsuarioID  uuid.UUID
	SenhaAtual string
	NovaSenha  string
	// RefreshToken é opcional: quando informado e pertencente ao usuário, a
	// sessão correspondente é preservada e as demais são revogadas. Sem ele,
	// todas as sessões são revogadas.
	RefreshToken string
}

type AlterarMinhaSenhaUseCase struct {
	contas identidade.ContaRepository
	tokens identidade.RefreshTokenRepository
}

func NewAlterarMinhaSenhaUseCase(contas identidade.ContaRepository, tokens identidade.RefreshTokenRepository) *AlterarMinhaSenhaUseCase {
	return &AlterarMinhaSenhaUseCase{contas: contas, tokens: tokens}
}

func (uc *AlterarMinhaSenhaUseCase) Execute(ctx context.Context, in AlterarMinhaSenhaInput) error {
	u, err := carregarUsuario(ctx, uc.contas, in.UsuarioID)
	if err != nil {
		return err
	}
	if !u.Ativo {
		return shared.ErrUsuarioInativo
	}
	if err := bcrypt.CompareHashAndPassword([]byte(u.SenhaHash), []byte(in.SenhaAtual)); err != nil {
		return shared.ErrSenhaAtualIncorreta
	}
	if in.NovaSenha == in.SenhaAtual {
		return shared.ErrSenhaIgualAnterior
	}
	if err := identidade.ValidarSenha(in.NovaSenha); err != nil {
		return err
	}
	hash, err := hashSenha(in.NovaSenha)
	if err != nil {
		return err
	}
	u.DefinirSenha(hash, false)
	if err := uc.contas.Save(ctx, u); err != nil {
		return fmt.Errorf("salvar usuário: %w", err)
	}

	if in.RefreshToken != "" {
		atual, err := uc.tokens.GetByHash(ctx, HashRefreshToken(in.RefreshToken))
		if err != nil {
			return fmt.Errorf("buscar refresh token: %w", err)
		}
		if atual != nil && atual.UsuarioID == u.ID && atual.RevogadoEm == nil {
			if err := uc.tokens.RevogarTodosDoUsuarioExceto(ctx, u.ID, atual.FamiliaID); err != nil {
				return fmt.Errorf("revogar tokens: %w", err)
			}
			return nil
		}
	}
	if err := uc.tokens.RevogarTodosDoUsuario(ctx, u.ID); err != nil {
		return fmt.Errorf("revogar tokens: %w", err)
	}
	return nil
}

// ─────────────────────────────────────────────────────────────────────────────
// helpers
// ─────────────────────────────────────────────────────────────────────────────

func carregarUsuario(ctx context.Context, repo identidade.Repository, id uuid.UUID) (*identidade.Usuario, error) {
	u, err := repo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("buscar usuário: %w", err)
	}
	if u == nil {
		return nil, shared.ErrNotFound
	}
	return u, nil
}

// garantirRebaixamentoSeguro valida as duas regras que protegem o acesso
// administrativo ao tirar o papel de ADMIN ativo de `alvo` (desativando-o ou
// mudando seu perfil): o ator não pode fazê-lo a si mesmo, e o sistema não
// pode ficar sem nenhum ADMIN ativo.
func garantirRebaixamentoSeguro(ctx context.Context, contas identidade.ContaRepository, alvo *identidade.Usuario, atorID uuid.UUID) error {
	if alvo.ID == atorID {
		return shared.ErrAutoModificacao
	}
	if !alvo.Ativo {
		return nil // admin já inativo: não conta no total de ativos
	}
	n, err := contas.ContarAdminsAtivos(ctx)
	if err != nil {
		return fmt.Errorf("contar administradores: %w", err)
	}
	if n <= 1 {
		return shared.ErrUltimoAdmin
	}
	return nil
}
