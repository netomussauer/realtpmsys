package jobs

import (
	"bytes"
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"

	"github.com/robfig/cron/v3"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type fakePurger struct {
	chamadas  []time.Time
	removidos int64
	err       error
}

func (f *fakePurger) PurgarExpirados(_ context.Context, antes time.Time) (int64, error) {
	f.chamadas = append(f.chamadas, antes)
	return f.removidos, f.err
}

func novoJobParaTeste(p RefreshTokenPurger) (*RefreshTokenJob, *bytes.Buffer) {
	var buf bytes.Buffer
	logger := slog.New(slog.NewTextHandler(&buf, nil))
	j := NewRefreshTokenJob(p, logger)
	j.agora = func() time.Time { return time.Date(2026, 11, 10, 3, 30, 0, 0, time.UTC) }
	return j, &buf
}

func TestRefreshTokenJob_PurgaApenasExpiradosHaMaisDaRetencao(t *testing.T) {
	p := &fakePurger{removidos: 42}
	j, log := novoJobParaTeste(p)

	j.Executar()

	require.Len(t, p.chamadas, 1)
	// agora (10/11 03:30) - 7 dias = 03/11 03:30: NUNCA "agora", para não apagar
	// tokens que acabaram de expirar nem, principalmente, tokens ainda válidos.
	assert.Equal(t, time.Date(2026, 11, 3, 3, 30, 0, 0, time.UTC), p.chamadas[0])
	assert.Contains(t, log.String(), "removidos=42")
}

func TestRefreshTokenJob_RetencaoPadraoEDeSeteDias(t *testing.T) {
	assert.Equal(t, 7*24*time.Hour, RetencaoRefreshTokens)
}

func TestRefreshTokenJob_ErroEhLogadoENaoPropagaNemQuebra(t *testing.T) {
	p := &fakePurger{err: errors.New("banco fora")}
	j, log := novoJobParaTeste(p)

	assert.NotPanics(t, j.Executar, "um job agendado nunca pode derrubar o processo")
	assert.Contains(t, log.String(), "job_purga_refresh_tokens_erro")
	assert.Contains(t, log.String(), "banco fora")
	assert.NotContains(t, log.String(), "job_purga_refresh_tokens_fim")
}

func TestRefreshTokenJob_RegisterAgendaUmaEntradaDiariaAs0330(t *testing.T) {
	p := &fakePurger{}
	j, _ := novoJobParaTeste(p)
	c := cron.New()

	j.Register(c)

	entradas := c.Entries()
	require.Len(t, entradas, 1)
	base := time.Date(2026, 11, 10, 12, 0, 0, 0, time.UTC)
	proxima := entradas[0].Schedule.Next(base)
	assert.Equal(t, time.Date(2026, 11, 11, 3, 30, 0, 0, time.UTC), proxima, "próxima execução às 03:30 do dia seguinte")
	assert.Equal(t, time.Date(2026, 11, 12, 3, 30, 0, 0, time.UTC), entradas[0].Schedule.Next(proxima), "e uma vez por dia")
}
