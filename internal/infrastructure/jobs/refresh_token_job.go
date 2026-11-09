package jobs

import (
	"context"
	"log/slog"
	"time"

	"github.com/robfig/cron/v3"
)

// RetencaoRefreshTokens é por quanto tempo um refresh token já EXPIRADO ainda
// é mantido na tabela antes da purga. Um token expirado já é inútil (o JWT
// falha na validação antes de qualquer consulta ao banco); a folga existe só
// para investigação de incidentes.
const RetencaoRefreshTokens = 7 * 24 * time.Hour

// RefreshTokenPurger é a porta mínima de que o job precisa. Implementada por
// repository.PgxRefreshTokenRepository.
type RefreshTokenPurger interface {
	// PurgarExpirados apaga os tokens com expiração anterior a `antes` e
	// devolve quantos removeu.
	PurgarExpirados(ctx context.Context, antes time.Time) (int64, error)
}

// RefreshTokenJob remove periodicamente refresh tokens expirados. Sem ele a
// tabela refresh_tokens cresce para sempre: cada login e cada renovação
// (rotação) insere uma linha.
//
// IMPORTANTE: só tokens EXPIRADOS são apagados. Um token revogado mas ainda
// válido precisa permanecer — é a linha revogada que permite detectar o
// reuso de um token consumido e derrubar a família.
type RefreshTokenJob struct {
	purger   RefreshTokenPurger
	logger   *slog.Logger
	retencao time.Duration
	agora    func() time.Time
}

func NewRefreshTokenJob(purger RefreshTokenPurger, logger *slog.Logger) *RefreshTokenJob {
	return &RefreshTokenJob{
		purger:   purger,
		logger:   logger,
		retencao: RetencaoRefreshTokens,
		agora:    time.Now,
	}
}

// Register agenda a purga: todo dia às 03:30 (fuso do scheduler), longe dos
// jobs de mensalidade (01:00 e 06:00 do dia 1).
func (j *RefreshTokenJob) Register(c *cron.Cron) {
	c.AddFunc("30 3 * * *", j.Executar) //nolint:errcheck
}

// Executar roda uma purga. Exportado para facilitar testes e execução manual.
func (j *RefreshTokenJob) Executar() {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Minute)
	defer cancel()

	corte := j.agora().Add(-j.retencao)
	j.logger.Info("job_purga_refresh_tokens_inicio", "expirados_antes_de", corte.UTC().Format(time.RFC3339))

	n, err := j.purger.PurgarExpirados(ctx, corte)
	if err != nil {
		j.logger.Error("job_purga_refresh_tokens_erro", "error", err)
		return
	}
	j.logger.Info("job_purga_refresh_tokens_fim", "removidos", n)
}
