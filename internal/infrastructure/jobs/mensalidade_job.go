// Package jobs contém os jobs agendados da aplicação.
package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/robfig/cron/v3"
	appfinanceiro "github.com/realtpmsys/realtpmsys/internal/application/financeiro"
)

// MensalidadeJob encapsula o job de geração automática de mensalidades.
type MensalidadeJob struct {
	useCase *appfinanceiro.GerarMensalidadesUseCase
	logger  *slog.Logger
}

func NewMensalidadeJob(uc *appfinanceiro.GerarMensalidadesUseCase, logger *slog.Logger) *MensalidadeJob {
	return &MensalidadeJob{useCase: uc, logger: logger}
}

// Register registra o job no scheduler com execução no dia 1 de cada mês às 06:00.
// Também registra um job diário às 01:00 para marcar mensalidades como VENCIDO.
func (j *MensalidadeJob) Register(c *cron.Cron) {
	// Gerar mensalidades: dia 1 de cada mês às 06:00
	c.AddFunc("0 6 1 * *", j.gerarMesAtual) //nolint:errcheck

	// Marcar vencidas: todo dia às 01:00
	c.AddFunc("0 1 * * *", j.marcarVencidas) //nolint:errcheck
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

	result, err := j.useCase.Execute(ctx, input)
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

func (j *MensalidadeJob) marcarVencidas() {
	// TODO: implementar use case MarcarMensalidadesVencidasUseCase
	// que chama a query fn_marcar_mensalidades_vencidas() do schema.sql
	j.logger.Info("job_marcar_vencidas_executado")
}
