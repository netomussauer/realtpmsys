# Guia de Implementação — Camada de Persistência (Go)

**Para:** dev-expert-fullcycle
**Referência:** docs/SDD.md §4 · docs/schema.sql · sqlc.yaml
**Stack:** Go 1.22 · pgx/v5 · sqlc · golang-migrate

---

## 1. Princípio Central: Ports & Adapters em Go

Em Go, interfaces são implícitas — qualquer struct que implementa os métodos satisfaz a interface **sem declaração explícita**. Isso torna Ports & Adapters estruturalmente natural.

```go
// Port: definido no domínio — sem import de infraestrutura
// internal/domain/financeiro/repository.go
type MensalidadeRepository interface {
    GetByID(ctx context.Context, id uuid.UUID) (*Mensalidade, error)
    Save(ctx context.Context, m *Mensalidade) error
    // ...
}

// Adapter: implementa o port na infraestrutura
// internal/infrastructure/persistence/repository/mensalidade_repository.go
type PgxMensalidadeRepository struct { pool *pgxpool.Pool }

// Garantia em compile-time: se PgxMensalidadeRepository não implementar
// todos os métodos de MensalidadeRepository, o build falha aqui:
var _ financeiro.MensalidadeRepository = (*PgxMensalidadeRepository)(nil)
```

**Regra:** O domínio nunca importa pgx, sqlc ou qualquer pacote de infra.

---

## 2. Configuração do Pool de Conexões

### `cmd/api/main.go` (wiring de pool)

```go
poolCfg, _ := pgxpool.ParseConfig(os.Getenv("DB_URL"))
poolCfg.MaxConns = 10
poolCfg.MinConns = 2
// pool_pre_ping: pgx valida conexões automaticamente

pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
```

**Por que pgxpool e não database/sql:**

- `pgxpool` é o pool nativo do pgx com suporte a `LISTEN/NOTIFY`, `CopyFrom` e tipos PostgreSQL nativos.
- `database/sql` adiciona uma camada de abstração desnecessária quando o banco é sempre PostgreSQL.

---

## 3. sqlc — Queries Type-Safe Geradas

### Fluxo de trabalho

```text
SQL em internal/infrastructure/persistence/sqlc/queries/*.sql
              ↓ make sqlc
Go gerado em internal/infrastructure/persistence/sqlc/*.go
              ↓ import nos repositórios
Repository usa sqlcgen.Queries para executar queries
```

### Exemplo de query e código gerado

**SQL** (`queries/mensalidade.sql`):

```sql
-- name: GetMensalidadeByID :one
SELECT * FROM mensalidades WHERE id = $1;
```

**Go gerado** (nunca editar manualmente):

```go
// sqlc/query.sql.go — gerado por: make sqlc
func (q *Queries) GetMensalidadeByID(ctx context.Context, id uuid.UUID) (Mensalidade, error) {
    row := q.db.QueryRow(ctx, getMensalidadeByID, id)
    var m Mensalidade
    err := row.Scan(&m.ID, &m.ContratoID, /* ... */)
    return m, err
}
```

### Adicionar nova query

```bash
# 1. Escrever SQL em internal/infrastructure/persistence/sqlc/queries/novo.sql
# 2. Regenerar
make sqlc

# 3. Verificar geração sem erros
make sqlc/verify
```

---

## 4. Padrão de Repositório Go

### Estrutura de um repositório completo

```go
// internal/infrastructure/persistence/repository/atleta_repository.go
package repository

import (
    "context"
    "errors"
    "fmt"

    "github.com/google/uuid"
    "github.com/jackc/pgx/v5"
    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/realtpmsys/realtpmsys/internal/domain/atleta"
    sqlcgen "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/sqlc"
)

type PgxAtletaRepository struct {
    pool    *pgxpool.Pool
    queries *sqlcgen.Queries
}

func NewPgxAtletaRepository(pool *pgxpool.Pool) *PgxAtletaRepository {
    return &PgxAtletaRepository{pool: pool, queries: sqlcgen.New(pool)}
}

// Garantia compile-time do contrato
var _ atleta.Repository = (*PgxAtletaRepository)(nil)

func (r *PgxAtletaRepository) GetByID(ctx context.Context, id uuid.UUID) (*atleta.Atleta, error) {
    row, err := r.queries.GetAtletaByID(ctx, id)
    if err != nil {
        if errors.Is(err, pgx.ErrNoRows) {
            return nil, nil // não encontrado = nil, nil (sem ErrNotFound aqui)
        }
        return nil, fmt.Errorf("GetAtletaByID: %w", err)
    }
    return toAtletaEntity(row), nil
}

func (r *PgxAtletaRepository) Save(ctx context.Context, a *atleta.Atleta) error {
    // Verifica se é insert ou update
    existing, err := r.queries.GetAtletaByID(ctx, a.ID)
    if err != nil && !errors.Is(err, pgx.ErrNoRows) {
        return fmt.Errorf("verificar existência: %w", err)
    }
    if existing.ID == uuid.Nil {
        // INSERT
        _, err = r.queries.InsertAtleta(ctx, sqlcgen.InsertAtletaParams{
            ID:             a.ID,
            Nome:           a.Nome,
            DataNascimento: a.DataNascimento,
            Cpf:            a.CPF,
            // ...
        })
    } else {
        // UPDATE
        _, err = r.queries.UpdateAtleta(ctx, sqlcgen.UpdateAtletaParams{
            ID:    a.ID,
            Nome:  a.Nome,
            // ...
        })
    }
    return err
}

// Mapeamento: sqlc model → entidade de domínio
func toAtletaEntity(row sqlcgen.Atleta) *atleta.Atleta {
    return &atleta.Atleta{
        ID:             row.ID,
        Nome:           row.Nome,
        DataNascimento: row.DataNascimento,
        CPF:            row.Cpf,
        Status:         atleta.Status(row.Status),
        CriadoEm:      row.CriadoEm,
        AtualizadoEm:  row.AtualizadoEm,
    }
}
```

---

## 5. Transações com pgx

Operações que envolvem múltiplas tabelas exigem transação explícita.

```go
// Exemplo: FirmarContrato + GerarPrimeiraMensalidade em uma transação
func (r *PgxContratoRepository) FirmarComPrimeiraMensalidade(
    ctx context.Context,
    contrato *financeiro.Contrato,
    mensalidade *financeiro.Mensalidade,
) error {
    tx, err := r.pool.Begin(ctx)
    if err != nil {
        return fmt.Errorf("iniciar tx: %w", err)
    }
    defer tx.Rollback(ctx) // no-op se Commit já foi chamado

    qtx := r.queries.WithTx(tx)

    if _, err := qtx.InsertContrato(ctx, /* params */); err != nil {
        return fmt.Errorf("insert contrato: %w", err)
    }
    if _, err := qtx.InsertMensalidade(ctx, /* params */); err != nil {
        return fmt.Errorf("insert mensalidade: %w", err)
    }

    return tx.Commit(ctx)
}
```

---

## 6. Migrations com golang-migrate

```bash
# Instalar ferramenta
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest

# Aplicar todas as migrations pendentes
make migrate-up

# Reverter 1 migration
make migrate-down

# Criar nova migration
make migrate-create
# → informar nome: add_notificacoes
# → gera: migrations/000002_add_notificacoes.up.sql
#          migrations/000002_add_notificacoes.down.sql
```

**Regras de migration:**

- Sempre em par: `.up.sql` e `.down.sql`
- Forward-only em produção: nunca reverter após merge na main
- Cada migration deve ser idempotente quando possível (`CREATE TABLE IF NOT EXISTS`)
- Migrations de dados pesados (backfill) em migration separada da estrutura

---

## 7. Testes Go da Camada de Persistência

### Testes unitários de domínio (sem banco)

```go
// internal/domain/financeiro/entity_test.go
package financeiro_test

import (
    "testing"
    "time"

    "github.com/google/uuid"
    "github.com/realtpmsys/realtpmsys/internal/domain/financeiro"
    "github.com/realtpmsys/realtpmsys/internal/domain/shared"
    "github.com/shopspring/decimal"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func novaMensalidadePendente(t *testing.T) *financeiro.Mensalidade {
    t.Helper()
    return &financeiro.Mensalidade{
        ID:             uuid.New(),
        ContratoID:     uuid.New(),
        AtletaID:       uuid.New(),
        CompetenciaAno: 2026,
        CompetenciaMes: 4,
        DataVencimento: time.Date(2026, 4, 10, 0, 0, 0, 0, time.UTC),
        Valor:          decimal.NewFromFloat(200.00),
        Status:         financeiro.MensalidadePendente,
    }
}

func TestMensalidade_RegistrarPagamento(t *testing.T) {
    tests := []struct {
        name    string
        status  financeiro.StatusMensalidade
        wantErr error
    }{
        {"pendente deve pagar",  financeiro.MensalidadePendente,  nil},
        {"vencido deve pagar",   financeiro.MensalidadeVencido,   nil},
        {"pago retorna erro",    financeiro.MensalidadePago,      shared.ErrMensalidadeJaPaga},
        {"cancelado retorna erro", financeiro.MensalidadeCancelado, shared.ErrMensalidadeCancelada},
    }
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            m := novaMensalidadePendente(t)
            m.Status = tt.status

            err := m.RegistrarPagamento(
                decimal.NewFromFloat(200.00),
                time.Now(),
                "PIX",
                nil,
            )
            if tt.wantErr != nil {
                require.ErrorIs(t, err, tt.wantErr)
                return
            }
            require.NoError(t, err)
            assert.Equal(t, financeiro.MensalidadePago, m.Status)
        })
    }
}
```

### Testes de integração do repositório (com banco real)

```go
//go:build integration
// +build integration

// internal/infrastructure/persistence/repository/mensalidade_repository_test.go
package repository_test

import (
    "context"
    "os"
    "testing"

    "github.com/jackc/pgx/v5/pgxpool"
    "github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/repository"
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func setupTestPool(t *testing.T) *pgxpool.Pool {
    t.Helper()
    dbURL := os.Getenv("DB_URL_TEST")
    if dbURL == "" {
        t.Skip("DB_URL_TEST não configurado")
    }
    pool, err := pgxpool.New(context.Background(), dbURL)
    require.NoError(t, err)
    t.Cleanup(pool.Close)
    return pool
}

func TestPgxMensalidadeRepository_GetByContratoCompetencia_Idempotencia(t *testing.T) {
    pool := setupTestPool(t)
    repo := repository.NewPgxMensalidadeRepository(pool)
    ctx := context.Background()

    // Busca de mensalidade inexistente deve retornar nil, nil (não erro)
    m, err := repo.GetByContratoCompetencia(ctx, uuid.New(), 2026, 4)
    require.NoError(t, err)
    assert.Nil(t, m)
}
```

```bash
# Rodar apenas unitários (rápido, sem banco)
make test/unit

# Rodar integração (requer DB_URL_TEST)
make test/integration
```

---

## 8. Checklist de Implementação por Módulo

```text
[ ] 1. Entidade de domínio em internal/domain/<contexto>/entity.go
[ ] 2. Interface Repository em internal/domain/<contexto>/repository.go
[ ] 3. SQL queries em internal/infrastructure/persistence/sqlc/queries/<contexto>.sql
[ ] 4. make sqlc — regenerar código Go das queries
[ ] 5. Repositório concreto em internal/infrastructure/persistence/repository/<contexto>_repository.go
[ ] 6. var _ domain.Repository = (*PgxRepository)(nil) — garantia compile-time
[ ] 7. Use Case em internal/application/<contexto>/use_cases.go
[ ] 8. Handler HTTP em internal/infrastructure/http/handler/<contexto>_handler.go
[ ] 9. Registrar rotas em internal/infrastructure/http/router.go
[10] 10. Testes unitários: internal/domain/<contexto>/entity_test.go
[11] 11. Testes de integração: internal/infrastructure/persistence/repository/<contexto>_repository_test.go
[12] 12. make check — fmt + vet + lint + test
```

---

## 9. Variáveis de Ambiente

Ver [.env.example](../.env.example) para a lista completa.

```bash
# Verificação rápida antes do primeiro run
cp .env.example .env
# Editar DB_URL e JWT_SECRET

# Subir banco e aplicar migrations
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:16
make migrate-up

# Gerar código sqlc (após qualquer mudança em queries/)
make sqlc

# Rodar
make run
```
