// Package main é o entry point da aplicação realtpmsys.
// Responsável por: carregar config, montar DI, iniciar servidor e scheduler.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/robfig/cron/v3"
	appfinanceiro "github.com/realtpmsys/realtpmsys/internal/application/financeiro"
	"github.com/realtpmsys/realtpmsys/internal/config"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/handler"
	infrahttp "github.com/realtpmsys/realtpmsys/internal/infrastructure/http"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/jobs"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/persistence/repository"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	if err := run(logger); err != nil {
		logger.Error("falha ao iniciar aplicação", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	// ── Configuração ────────────────────────────────────────────────────────
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("carregar config: %w", err)
	}

	// ── Pool de conexões PostgreSQL ──────────────────────────────────────────
	poolCfg, err := pgxpool.ParseConfig(cfg.DB.URL)
	if err != nil {
		return fmt.Errorf("parsear DB_URL: %w", err)
	}
	poolCfg.MaxConns = cfg.DB.MaxConns
	poolCfg.MinConns = cfg.DB.MinConns

	ctx := context.Background()
	pool, err := pgxpool.NewWithConfig(ctx, poolCfg)
	if err != nil {
		return fmt.Errorf("conectar ao banco: %w", err)
	}
	defer pool.Close()

	if err := pool.Ping(ctx); err != nil {
		return fmt.Errorf("ping ao banco falhou: %w", err)
	}
	logger.Info("banco de dados conectado")

	// ── Repositórios (Adapters) ──────────────────────────────────────────────
	mensalidadeRepo := repository.NewPgxMensalidadeRepository(pool)
	// TODO: inicializar demais repositórios conforme implementação avança
	// atletaRepo    := repository.NewPgxAtletaRepository(pool)
	// contratoRepo  := repository.NewPgxContratoRepository(pool)
	// planoRepo     := repository.NewPgxPlanoRepository(pool)

	// ── Use Cases ────────────────────────────────────────────────────────────
	// registrarPagamento := appfinanceiro.NewRegistrarPagamentoUseCase(mensalidadeRepo)
	// cancelarMensalidade := appfinanceiro.NewCancelarMensalidadeUseCase(mensalidadeRepo)
	// gerarMensalidades := appfinanceiro.NewGerarMensalidadesUseCase(contratoRepo, mensalidadeRepo, planoRepo)

	// Temporário: handlers com repositório direto até demais repos serem implementados
	_ = mensalidadeRepo
	_ = appfinanceiro.NewRegistrarPagamentoUseCase // referência para evitar lint

	// ── Handlers HTTP ────────────────────────────────────────────────────────
	// mensalidadeHandler := handler.NewMensalidadeHandler(
	//     registrarPagamento, cancelarMensalidade, gerarMensalidades, mensalidadeRepo,
	// )
	_ = handler.NewMensalidadeHandler // referência para evitar lint

	// ── Scheduler (cron jobs) ────────────────────────────────────────────────
	scheduler := cron.New(cron.WithLocation(mustLoadLocation("America/Sao_Paulo")))
	// mensalidadeJob := jobs.NewMensalidadeJob(gerarMensalidades, logger)
	// mensalidadeJob.Register(scheduler)
	_ = jobs.NewMensalidadeJob
	scheduler.Start()
	defer scheduler.Stop()

	// ── Router HTTP ──────────────────────────────────────────────────────────
	// router := infrahttp.NewRouter(cfg.JWT.Secret, mensalidadeHandler)
	router := infrahttp.NewRouter(cfg.JWT.Secret, nil) // nil temporário
	_ = router

	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeoutSecs) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeoutSecs) * time.Second,
	}

	// ── Graceful shutdown ────────────────────────────────────────────────────
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	go func() {
		logger.Info("servidor iniciado", "port", cfg.Server.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Error("servidor encerrado com erro", "error", err)
		}
	}()

	<-quit
	logger.Info("sinal de encerramento recebido, iniciando graceful shutdown")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		return fmt.Errorf("graceful shutdown falhou: %w", err)
	}

	logger.Info("servidor encerrado com sucesso")
	return nil
}

func mustLoadLocation(name string) *time.Location {
	loc, err := time.LoadLocation(name)
	if err != nil {
		return time.UTC
	}
	return loc
}
