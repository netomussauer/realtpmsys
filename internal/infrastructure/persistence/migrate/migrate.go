// Package migrate aplica migrations golang-migrate no startup da aplicação.
package migrate

import (
	"errors"
	"fmt"
	"log/slog"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// Run aplica todas as migrations pendentes. Idempotente — se não houver
// migrations pendentes retorna nil silenciosamente.
//
// migrationsPath é um caminho relativo ou absoluto sem o prefixo "file://".
func Run(logger *slog.Logger, databaseURL, migrationsPath string) error {
	source := "file://" + migrationsPath

	m, err := migrate.New(source, databaseURL)
	if err != nil {
		return fmt.Errorf("migrate init: %w", err)
	}
	defer func() {
		srcErr, dbErr := m.Close()
		if srcErr != nil {
			logger.Error("migrate fechar source", "error", srcErr)
		}
		if dbErr != nil {
			logger.Error("migrate fechar db", "error", dbErr)
		}
	}()

	if err := m.Up(); err != nil {
		if errors.Is(err, migrate.ErrNoChange) {
			logger.Info("migrate: nenhuma migration pendente")
			return nil
		}
		return fmt.Errorf("migrate up: %w", err)
	}

	version, dirty, err := m.Version()
	if err != nil {
		logger.Warn("migrate: leitura de versão falhou", "error", err)
		return nil
	}
	logger.Info("migrate: migrations aplicadas", "version", version, "dirty", dirty)
	return nil
}
