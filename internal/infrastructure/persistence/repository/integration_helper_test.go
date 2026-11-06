//go:build integration

// Package repository: helper compartilhado pelos testes de integração.
//
// Pré-requisitos:
//   - DB de teste já criado (vide Makefile `db/test-setup`)
//   - Env var DB_URL_TEST apontando para o postgres de teste
//   - Migrations versionadas em ./migrations/
//
// Padrão dos testes:
//   - cada *_repository_test.go chama setupTestDB() no início e usa
//     truncateAll() entre cenários para isolamento
//   - migrations são aplicadas UMA vez no primeiro setupTestDB
//
// Roda com:
//
//	make test/integration                 # Makefile faz port-forward + tag
//	go test -tags integration -count=1 ./internal/infrastructure/...
package repository

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"runtime"
	"sync"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/migrate"
)

var (
	// poolSingleton — uma conexão por processo de teste para evitar
	// reabrir o pool a cada subtest. Inicializado no primeiro setupTestDB.
	poolSingleton *pgxpool.Pool
	poolErr       error
	poolOnce      sync.Once
)

// setupTestDB devolve um *pgxpool.Pool conectado ao banco de testes e
// garante que as migrations estão aplicadas. Falha imediata se DB_URL_TEST
// não estiver setado — testes de integração são opt-in pelo build tag, mas
// também opt-in pela env var (assim `go test ./...` continua passando sem
// banco quando rodado por engano).
func setupTestDB(t *testing.T) *pgxpool.Pool {
	t.Helper()

	poolOnce.Do(func() {
		dbURL := os.Getenv("DB_URL_TEST")
		if dbURL == "" {
			poolErr = fmt.Errorf("DB_URL_TEST não setado — vide Makefile target test/integration")
			return
		}

		// Aplica migrations de forma idempotente. ErrNoChange é tratado em migrate.Run.
		logger := slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelError}))
		if err := migrate.Run(logger, dbURL, migrationsDir()); err != nil {
			poolErr = fmt.Errorf("aplicar migrations no DB de teste: %w", err)
			return
		}

		pool, err := pgxpool.New(context.Background(), dbURL)
		if err != nil {
			poolErr = fmt.Errorf("conectar ao DB de teste: %w", err)
			return
		}
		if err := pool.Ping(context.Background()); err != nil {
			poolErr = fmt.Errorf("ping no DB de teste: %w", err)
			return
		}
		poolSingleton = pool
	})

	if poolErr != nil {
		t.Fatalf("setupTestDB: %v", poolErr)
	}
	return poolSingleton
}

// truncateAll limpa todas as tabelas do schema public, preservando o
// schema (não dropa nem reaplica migrations). RESTART IDENTITY zera
// sequences. CASCADE resolve FKs sem precisar ordenar manualmente.
//
// Chame no início de cada teste/subtest que precisa de banco em estado
// conhecido — mais rápido que dropar e remigrar.
func truncateAll(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()

	// Coleta os nomes das tabelas (exclui schema_migrations — apagar
	// forçaria re-aplicar migrations e invalidaria o setup do package).
	rows, err := pool.Query(ctx, `
		SELECT tablename
		FROM   pg_tables
		WHERE  schemaname = 'public'
		  AND  tablename <> 'schema_migrations'
	`)
	if err != nil {
		t.Fatalf("listar tabelas para truncate: %v", err)
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			t.Fatalf("scan tablename: %v", err)
		}
		names = append(names, name)
	}
	if len(names) == 0 {
		return
	}

	// Quoting com identifier seguro via pg_catalog — só nomes vindos do
	// próprio pg_tables, sem input do teste. Concatenação aqui é segura.
	query := "TRUNCATE TABLE "
	for i, n := range names {
		if i > 0 {
			query += ", "
		}
		query += `"` + n + `"`
	}
	query += " RESTART IDENTITY CASCADE"

	if _, err := pool.Exec(ctx, query); err != nil {
		t.Fatalf("truncate: %v", err)
	}
}

// migrationsDir devolve o caminho absoluto para ./migrations a partir do
// arquivo deste teste (../../../../migrations). Necessário porque `go test`
// roda com cwd no diretório do pacote.
func migrationsDir() string {
	_, thisFile, _, _ := runtime.Caller(0)
	// .../internal/infrastructure/persistence/repository/integration_helper_test.go
	// ../../../../migrations
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "..", "..", "migrations")
}

