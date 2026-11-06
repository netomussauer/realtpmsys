package identidade

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Repository é o Port de leitura do contexto Identidade (login/refresh e
// consumidores de outros contextos, como Treinadores).
type Repository interface {
	GetByEmail(ctx context.Context, email string) (*Usuario, error)
	GetByID(ctx context.Context, id uuid.UUID) (*Usuario, error)
}

// ListFilter parametriza a listagem de contas.
type ListFilter struct {
	Busca   string  // casa com e-mail ou nome (ILIKE)
	Perfil  *Perfil // nil = todos
	Ativo   *bool   // nil = todos
	Page    int
	PerPage int
}

// ContaRepository é o Port da gestão de contas (escrita + listagem).
// Embute Repository: a mesma implementação atende os dois ports.
type ContaRepository interface {
	Repository
	List(ctx context.Context, f ListFilter) ([]*Usuario, int64, error)
	// Save faz upsert por ID (criação de conta). Conflito de e-mail devolve
	// shared.ErrEmailEmUso. NÃO use para alterar uma conta existente: um
	// read-modify-write fora de transação perde updates concorrentes — use Modificar.
	Save(ctx context.Context, u *Usuario) error
	// Modificar altera uma conta existente de forma atômica: abre uma
	// transação, toma o lock global de contas, relê a linha com FOR UPDATE,
	// executa fn e grava o resultado + efeitos de `tx` (revogação de tokens)
	// no mesmo commit. Se fn devolver erro, nada é gravado. Devolve
	// shared.ErrNotFound se a conta não existir.
	//
	// O lock global serializa as operações de conta entre si, o que fecha o
	// TOCTOU da regra do "último ADMIN" (duas desativações simultâneas de
	// admins diferentes) e o lost update (troca de senha × desativação).
	// Contas são operações raras e curtas, então o custo é irrelevante.
	Modificar(ctx context.Context, id uuid.UUID, fn func(ctx context.Context, u *Usuario, tx ContaTx) error) (*Usuario, error)
}

// ContaTx são as operações permitidas dentro de Modificar; todas rodam na
// mesma transação que grava a conta.
type ContaTx interface {
	// ContarAdminsAtivos conta ADMINs ativos e não removidos (visão transacional).
	ContarAdminsAtivos(ctx context.Context) (int64, error)
	RevogarTokensDoUsuario(ctx context.Context, usuarioID uuid.UUID) error
	// RevogarTokensDoUsuarioExceto revoga os tokens ativos do usuário, poupando uma família.
	RevogarTokensDoUsuarioExceto(ctx context.Context, usuarioID, familiaID uuid.UUID) error
}

// RefreshToken é um refresh token persistido. O token em texto puro nunca é
// guardado: apenas o hash SHA-256 (hex, 64 caracteres).
type RefreshToken struct {
	ID         uuid.UUID
	UsuarioID  uuid.UUID
	FamiliaID  uuid.UUID
	TokenHash  string
	ExpiraEm   time.Time
	RevogadoEm *time.Time
	CriadoEm   time.Time
}

// RefreshTokenRepository é o Port de persistência dos refresh tokens.
type RefreshTokenRepository interface {
	Save(ctx context.Context, t *RefreshToken) error
	// GetByHash devolve (nil, nil) quando o hash não existe.
	GetByHash(ctx context.Context, hash string) (*RefreshToken, error)
	// Revogar marca um token como revogado. Idempotente.
	Revogar(ctx context.Context, id uuid.UUID) error
	// RevogarSeAtivo revoga o token de forma atômica e informa se FOI esta
	// chamada que o revogou (true) ou se ele já estava revogado (false). É o
	// que torna a rotação do refresh imune à corrida: de duas requisições
	// concorrentes com o mesmo token, só uma recebe true.
	RevogarSeAtivo(ctx context.Context, id uuid.UUID) (bool, error)
	// RevogarFamilia revoga todos os tokens da cadeia de rotação.
	RevogarFamilia(ctx context.Context, familiaID uuid.UUID) error
	// RevogarTodosDoUsuario revoga todos os tokens ativos do usuário.
	RevogarTodosDoUsuario(ctx context.Context, usuarioID uuid.UUID) error
	// RevogarTodosDoUsuarioExceto revoga os tokens ativos do usuário, poupando uma família.
	RevogarTodosDoUsuarioExceto(ctx context.Context, usuarioID, familiaID uuid.UUID) error
}
