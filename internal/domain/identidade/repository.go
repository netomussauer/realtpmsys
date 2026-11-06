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
	// Save faz upsert por ID. Conflito de e-mail devolve shared.ErrEmailEmUso.
	Save(ctx context.Context, u *Usuario) error
	// ContarAdminsAtivos conta ADMINs ativos e não removidos.
	ContarAdminsAtivos(ctx context.Context) (int64, error)
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
	// RevogarFamilia revoga todos os tokens da cadeia de rotação.
	RevogarFamilia(ctx context.Context, familiaID uuid.UUID) error
	// RevogarTodosDoUsuario revoga todos os tokens ativos do usuário.
	RevogarTodosDoUsuario(ctx context.Context, usuarioID uuid.UUID) error
	// RevogarTodosDoUsuarioExceto revoga os tokens ativos do usuário, poupando uma família.
	RevogarTodosDoUsuarioExceto(ctx context.Context, usuarioID, familiaID uuid.UUID) error
}
