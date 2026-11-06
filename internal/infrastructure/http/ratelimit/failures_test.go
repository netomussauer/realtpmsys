package ratelimit

import (
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func comRelogio(l *FailureLimiter, t0 time.Time) *time.Time {
	agora := t0
	l.now = func() time.Time { return agora }
	return &agora
}

func TestReserve_BloqueiaAposMaxTentativas(t *testing.T) {
	l := New(3, time.Minute)
	for i := 0; i < 3; i++ {
		ok, _ := l.Reserve("a@b.co")
		assert.True(t, ok, "tentativa %d permitida", i+1)
	}
	ok, espera := l.Reserve("a@b.co")
	assert.False(t, ok)
	assert.Greater(t, espera, time.Duration(0))
	assert.LessOrEqual(t, espera, time.Minute)
}

func TestReserve_TentativaBloqueadaNaoConsomeCotaNemAdiaODesbloqueio(t *testing.T) {
	l := New(1, time.Minute)
	agora := comRelogio(l, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	l.Reserve("k")

	*agora = agora.Add(30 * time.Second)
	for i := 0; i < 20; i++ {
		ok, _ := l.Reserve("k") // insistir não pode estender o bloqueio
		assert.False(t, ok)
	}

	*agora = agora.Add(31 * time.Second) // 61s desde a única tentativa registrada
	ok, _ := l.Reserve("k")
	assert.True(t, ok, "o bloqueio expira na hora certa mesmo após insistência")
}

func TestReserve_ChavesSaoIndependentes(t *testing.T) {
	l := New(1, time.Minute)
	l.Reserve("a")
	okA, _ := l.Reserve("a")
	okB, _ := l.Reserve("b")
	assert.False(t, okA)
	assert.True(t, okB)
}

func TestReserve_DesbloqueiaQuandoAJanelaPassa(t *testing.T) {
	l := New(2, time.Minute)
	agora := comRelogio(l, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	l.Reserve("k")
	l.Reserve("k")
	ok, _ := l.Reserve("k")
	assert.False(t, ok)

	*agora = agora.Add(61 * time.Second)
	ok, _ = l.Reserve("k")
	assert.True(t, ok, "tentativas fora da janela deixam de contar")
}

func TestReserve_RetryAfterRefleteATentativaMaisAntigaQueContaParaOBloqueio(t *testing.T) {
	l := New(2, 10*time.Minute)
	agora := comRelogio(l, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	l.Reserve("k")                      // t=0
	*agora = agora.Add(4 * time.Minute) // t=4
	l.Reserve("k")

	ok, espera := l.Reserve("k")
	assert.False(t, ok)
	assert.Equal(t, 6*time.Minute, espera, "libera quando a tentativa de t=0 sai da janela (t=10)")
}

// Regressão do check-then-act: sob rajada paralela só `max` tentativas passam.
func TestReserve_ConcorrenciaNaoPassaDoLimite(t *testing.T) {
	const max = 10
	l := New(max, time.Minute)

	var wg sync.WaitGroup
	var permitidas int32
	for i := 0; i < 200; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if ok, _ := l.Reserve("alvo"); ok {
				atomic.AddInt32(&permitidas, 1)
			}
		}()
	}
	wg.Wait()
	assert.EqualValues(t, max, permitidas, "exatamente `max` tentativas passam, não mais")
}

func TestRefund_DevolveAUltimaTentativa(t *testing.T) {
	l := New(2, time.Minute)
	l.Reserve("k")
	l.Reserve("k")
	ok, _ := l.Reserve("k")
	assert.False(t, ok)

	l.Refund("k")
	ok, _ = l.Reserve("k")
	assert.True(t, ok, "a tentativa devolvida liberou uma vaga")
}

func TestRefund_ChaveInexistenteOuUnicaNaoQuebra(t *testing.T) {
	l := New(2, time.Minute)
	assert.NotPanics(t, func() { l.Refund("nunca-vista") })

	l.Reserve("k")
	l.Refund("k")
	assert.NotContains(t, l.entries, chave("k"), "sem tentativas, a entrada some")
}

func TestReset_ZeraAsTentativas(t *testing.T) {
	l := New(1, time.Minute)
	l.Reserve("k")
	ok, _ := l.Reserve("k")
	assert.False(t, ok)

	l.Reset("k")
	ok, _ = l.Reserve("k")
	assert.True(t, ok)
}

func TestNil_NaoBloqueiaNemQuebra(t *testing.T) {
	var l *FailureLimiter
	ok, espera := l.Reserve("k")
	assert.True(t, ok)
	assert.Zero(t, espera)
	assert.NotPanics(t, func() { l.Refund("k"); l.Reset("k") })
}

func TestChave_EmailGiganteOcupaOMesmoQueUmCurto(t *testing.T) {
	l := New(5, time.Minute)
	gigante := strings.Repeat("a", 16<<10)
	l.Reserve(gigante)
	l.Reserve("a@b.co")

	assert.Len(t, l.entries, 2)
	for k := range l.entries {
		assert.Len(t, k, 32, "a chave é sempre um digest de 32 bytes")
	}
}

func TestMemoria_TetoRigidoMesmoComTodasAsChavesAtivas(t *testing.T) {
	l := New(5, time.Hour)
	agora := comRelogio(l, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))

	// Ataque: muito mais chaves distintas e ATIVAS (nenhuma vencida) que o teto.
	for i := 0; i < maxChaves+500; i++ {
		l.Reserve(string(rune(0x1000+i)) + "x")
		*agora = agora.Add(time.Millisecond)
	}

	assert.LessOrEqual(t, len(l.entries), maxChaves, "o mapa nunca passa do teto")
	ok, _ := l.Reserve("recem-chegada")
	assert.True(t, ok, "uma chave nova ainda consegue ser rastreada")
}

func TestMemoria_VarreEntradasVencidasAoAtingirOTeto(t *testing.T) {
	l := New(5, time.Minute)
	agora := comRelogio(l, time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC))
	for i := 0; i < maxChaves; i++ {
		l.entries[chave(string(rune(i+1000))+"x")] = []time.Time{*agora}
	}
	*agora = agora.Add(2 * time.Minute) // todas vencidas

	l.Reserve("nova")

	assert.Less(t, len(l.entries), maxChaves/2, "a varredura remove as vencidas em bloco")
	assert.Contains(t, l.entries, chave("nova"))
}
