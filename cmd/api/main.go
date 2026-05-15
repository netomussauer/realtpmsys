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
	appatleta "github.com/realtpmsys/realtpmsys/internal/application/atleta"
	appfinanceiro "github.com/realtpmsys/realtpmsys/internal/application/financeiro"
	appfreq "github.com/realtpmsys/realtpmsys/internal/application/frequencia"
	appidentidade "github.com/realtpmsys/realtpmsys/internal/application/identidade"
	appturma "github.com/realtpmsys/realtpmsys/internal/application/turma"
	"github.com/realtpmsys/realtpmsys/internal/config"
	infrahttp "github.com/realtpmsys/realtpmsys/internal/infrastructure/http"
	"github.com/realtpmsys/realtpmsys/internal/infrastructure/http/handler"
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
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("carregar config: %w", err)
	}

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

	// Repositories
	mensalidadeRepo := repository.NewPgxMensalidadeRepository(pool)
	planoRepo := repository.NewPgxPlanoRepository(pool)
	contratoRepo := repository.NewPgxContratoRepository(pool)
	usuarioRepo := repository.NewPgxUsuarioRepository(pool)
	atletaRepo := repository.NewPgxAtletaRepository(pool)
	turmaRepo := repository.NewPgxTurmaRepository(pool)
	matriculaRepo := repository.NewPgxMatriculaRepository(pool)
	treinoRepo := repository.NewPgxTreinoRepository(pool)
	frequenciaRepo := repository.NewPgxFrequenciaRepository(pool)

	// Use Cases — Financeiro
	registrarPagamento := appfinanceiro.NewRegistrarPagamentoUseCase(mensalidadeRepo)
	cancelarMensalidade := appfinanceiro.NewCancelarMensalidadeUseCase(mensalidadeRepo)
	gerarMensalidades := appfinanceiro.NewGerarMensalidadesUseCase(contratoRepo, mensalidadeRepo, planoRepo)
	firmarContrato := appfinanceiro.NewFirmarContratoUseCase(contratoRepo, planoRepo)

	// Use Cases — Identidade
	loginUseCase := appidentidade.NewLoginUseCase(usuarioRepo, cfg.JWT.Secret, cfg.JWT.AccessExpireMinutes)

	// Use Cases — Atletas
	cadastrarAtleta := appatleta.NewCadastrarAtletaUseCase(atletaRepo)
	atualizarAtleta := appatleta.NewAtualizarAtletaUseCase(atletaRepo)
	mudarStatusAtleta := appatleta.NewMudarStatusAtletaUseCase(atletaRepo)
	removerAtleta := appatleta.NewRemoverAtletaUseCase(atletaRepo)

	// Use Cases — Turmas + Matrículas
	criarTurma := appturma.NewCriarTurmaUseCase(turmaRepo)
	atualizarTurma := appturma.NewAtualizarTurmaUseCase(turmaRepo)
	mudarStatusTurma := appturma.NewMudarStatusTurmaUseCase(turmaRepo)
	matricularAtleta := appturma.NewMatricularAtletaUseCase(turmaRepo, matriculaRepo, atletaRepo)
	cancelarMatricula := appturma.NewCancelarMatriculaUseCase(matriculaRepo)

	// Use Cases — Frequência (Treino + lançamento de presenças)
	criarTreino := appfreq.NewCriarTreinoUseCase(treinoRepo, turmaRepo)
	lancarFrequencia := appfreq.NewLancarFrequenciaUseCase(treinoRepo, frequenciaRepo)

	// Handlers
	handlers := infrahttp.Handlers{
		Auth:        handler.NewAuthHandler(loginUseCase),
		Atleta:      handler.NewAtletaHandler(cadastrarAtleta, atualizarAtleta, mudarStatusAtleta, removerAtleta, atletaRepo),
		Turma:       handler.NewTurmaHandler(criarTurma, atualizarTurma, mudarStatusTurma, matricularAtleta, cancelarMatricula, turmaRepo, matriculaRepo),
		Treino:      handler.NewTreinoHandler(criarTreino, lancarFrequencia, treinoRepo, frequenciaRepo),
		Mensalidade: handler.NewMensalidadeHandler(registrarPagamento, cancelarMensalidade, gerarMensalidades, mensalidadeRepo),
		Contrato:    handler.NewContratoHandler(firmarContrato),
	}

	// Scheduler
	scheduler := cron.New(cron.WithLocation(mustLoadLocation("America/Sao_Paulo")))
	mensalidadeJob := jobs.NewMensalidadeJob(gerarMensalidades, logger)
	mensalidadeJob.Register(scheduler)
	scheduler.Start()
	defer scheduler.Stop()

	router := infrahttp.NewRouter(cfg.JWT.Secret, handlers)

	srv := &http.Server{
		Addr:         ":" + cfg.Server.Port,
		Handler:      router,
		ReadTimeout:  time.Duration(cfg.Server.ReadTimeoutSecs) * time.Second,
		WriteTimeout: time.Duration(cfg.Server.WriteTimeoutSecs) * time.Second,
	}

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
