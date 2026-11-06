// Package jobs contém os jobs agendados da aplicação.
package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/robfig/cron/v3"
	appfinanceiro "github.com/realtpmsys/realtpmsys/internal/application/financeiro"
)

// MensalidadeJob encapsula os jobs do contexto Financeiro:
//   - geração mensal de mensalidades (dia 1, 06:00)
//   - marcação de mensalidades vencidas (todo dia, 01:00)
type MensalidadeJob struct {
	gerar          *appfinanceiro.GerarMensalidadesUseCase
	marcarVencidas *appfinanceiro.MarcarMensalidadesVencidasUseCase
	logger         *slog.Logger
}

func NewMensalidadeJob(
	gerar *appfinanceiro.GerarMensalidadesUseCase,
	marcarVencidas *appfinanceiro.MarcarMensalidadesVencidasUseCase,
	logger *slog.Logger,
) *MensalidadeJob {
	return &MensalidadeJob{
		gerar:          gerar,
		marcarVencidas: marcarVencidas,
		logger:         logger,
	}
}

// Register registra os jobs no scheduler.
func (j *MensalidadeJob) Register(c *cron.Cron) {
	// Gerar mensalidades: dia 1 de cada mês às 06:00
	c.AddFunc("0 6 1 * *", j.gerarMesAtual) //nolint:errcheck

	// Marcar vencidas: todo dia às 01:00
	c.AddFunc("0 1 * * *", j.executarMarcarVencidas) //nolint:errcheck
}

func (j *MensalidadeJob) gerarMesAtual() {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	now := time.Now()
	input := appfinanceiro.GerarMensalidadesInput{
		CompetenciaAno: now.Year(),
		CompetenciaMes: int(now.Month()),
	}

	j.logger.Info("job_gerar_mensalidades_inicio",
		"competencia_ano", input.CompetenciaAno,
		"competencia_mes", input.CompetenciaMes,
	)

	result, err := j.gerar.Execute(ctx, input)
	if err != nil {
		j.logger.Error("job_gerar_mensalidades_erro", "error", err)
		return
	}

	j.logger.Info("job_gerar_mensalidades_fim",
		"geradas", result.Geradas,
		"ignoradas", result.Ignoradas,
		"com_erro", result.ComErro,
	)
}

func (j *MensalidadeJob) executarMarcarVencidas() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	j.logger.Info("job_marcar_vencidas_inicio")
	result, err := j.marcarVencidas.Execute(ctx)
	if err != nil {
		j.logger.Error("job_marcar_vencidas_erro", "error", err)
		return
	}
	j.logger.Info("job_marcar_vencidas_fim", "atualizadas", result.Atualizadas)
}
