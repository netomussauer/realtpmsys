package ratelimit

import (
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func comRelogio(l *FailureLimiter, t0 time.Time) *time.Time {
	agora := t0
	l.now = func() time.Time { return agora }
	return &agora
}

func TestFailureLimiter_BloqueiaAposMaxFalhas(t *testing.T) {
	l := New(3, time.Minute)
	for i := 0; i < 3; i++ {
		ok, _ := l.Allow("a@b.co")
		assert.True(t, ok, "tentativa %d ainda permitida", i+1)
		l.Fail("a@b.co")
	}
	ok, espera := l.Allow("a@b.co")
	assert.False(t, ok)
	assert.Greater(t, espera, time.Duration(0))
	assert.LessOrEqual(t, espera, time.Minute)
}

func TestFailureLimiter_ChavesSaoIndependentes(t *testing.T) {
	l := New(1, time.Minute)
	l.Fail("a")
	okA, _ := l.Allow("a")
	okB, _ := l.Allow("b")
	assert.False(t, okA)
	assert.True(t, okB)
}

func TestFailureLimiter_DesbloqueiaQuandoAJanelaPassa(t *testing.T) {
	l := New(2, time.Minute)
	agora := comRelogio(l, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	l.Fail("k")
	l.Fail("k")
	ok, _ := l.Allow("k")
	assert.False(t, ok)

	*agora = agora.Add(61 * time.Second)
	ok, _ = l.Allow("k")
	assert.True(t, ok, "falhas fora da janela deixam de contar")
}

func TestFailureLimiter_RetryAfterRefleteAFalhaMaisAntigaQueContaParaOBloqueio(t *testing.T) {
	l := New(2, 10*time.Minute)
	agora := comRelogio(l, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	l.Fail("k")                         // t=0
	*agora = agora.Add(4 * time.Minute) // t=4
	l.Fail("k")

	ok, espera := l.Allow("k")
	assert.False(t, ok)
	assert.Equal(t, 6*time.Minute, espera, "libera quando a falha de t=0 sai da janela (t=10)")
}

func TestFailureLimiter_ResetZeraAsFalhas(t *testing.T) {
	l := New(1, time.Minute)
	l.Fail("k")
	ok, _ := l.Allow("k")
	assert.False(t, ok)

	l.Reset("k")
	ok, _ = l.Allow("k")
	assert.True(t, ok)
}

func TestFailureLimiter_NilNaoBloqueiaNemQuebra(t *testing.T) {
	var l *FailureLimiter
	ok, espera := l.Allow("k")
	assert.True(t, ok)
	assert.Zero(t, espera)
	assert.NotPanics(t, func() { l.Fail("k"); l.Reset("k") })
}

func TestFailureLimiter_VarreEntradasVencidasAoAtingirOTeto(t *testing.T) {
	l := New(5, time.Minute)
	agora := comRelogio(l, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	for i := 0; i < maxChaves; i++ {
		l.entries[string(rune(i+1000))+"x"] = []time.Time{*agora}
	}
	*agora = agora.Add(2 * time.Minute) // todas vencidas

	l.Fail("nova")

	assert.Less(t, len(l.entries), maxChaves, "a varredura remove as vencidas")
	assert.Contains(t, l.entries, "nova")
}
