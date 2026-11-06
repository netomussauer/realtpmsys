// Package ratelimit limita tentativas de autenticação.
//
// Cada tentativa é RESERVADA no momento da checagem (Reserve), de forma
// atômica: sob uma rajada paralela, só as primeiras `max` passam — checar e
// registrar em passos separados deixaria todas passarem antes de qualquer
// registro. Uma tentativa que não deve contar (erro que não é de credencial)
// é devolvida com Refund; um sucesso zera o contador com Reset.
//
// Fica em memória do processo — o backend roda com 1 réplica; com mais, o
// limite efetivo multiplica pelo número de réplicas (ainda útil, menos estrito).
//
// A chave é escolhida pelo chamador. No login usamos o e-mail e não o IP: o
// backend recebe as chamadas pelo BFF do Next, então todos os usuários
// chegariam com o mesmo IP de origem e um limite por IP puniria todo mundo.
//
// Trade-off assumido: limitar por e-mail permite que um atacante bloqueie
// temporariamente a conta de uma vítima errando a senha de propósito (DoS de
// conta, de duração = janela). É o preço de frear força bruta sem ter o IP
// real do cliente; o bloqueio é curto e se desfaz sozinho.
package ratelimit

import (
	"crypto/sha256"
	"sync"
	"time"
)

// maxChaves é o teto rígido de chaves rastreadas. Ao atingi-lo, entradas
// vencidas são varridas e, se ainda não houver espaço, uma chave arbitrária é
// descartada: a memória nunca passa de maxChaves × (32 B + max timestamps),
// mesmo sob ataque com e-mails todos diferentes.
const maxChaves = 10000

// intervaloVarredura evita varrer o mapa inteiro a cada tentativa quando ele
// está cheio (custo O(n) sob o mutex).
const intervaloVarredura = time.Minute

type FailureLimiter struct {
	mu            sync.Mutex
	max           int
	window        time.Duration
	now           func() time.Time
	entries       map[[32]byte][]time.Time
	ultimaVarrida time.Time
}

// New cria um limitador que bloqueia a chave após `max` tentativas dentro de
// `window`. O bloqueio dura até a tentativa mais antiga sair da janela.
func New(max int, window time.Duration) *FailureLimiter {
	return &FailureLimiter{
		max:     max,
		window:  window,
		now:     time.Now,
		entries: make(map[[32]byte][]time.Time),
	}
}

// chave reduz a string do chamador a um digest de tamanho fixo: uma chave de
// 16 KiB (corpo máximo) ocupa o mesmo que uma de 10 bytes.
func chave(s string) [32]byte { return sha256.Sum256([]byte(s)) }

// recentes devolve as tentativas ainda dentro da janela (mu já travado).
func (l *FailureLimiter) recentes(k [32]byte) []time.Time {
	corte := l.now().Add(-l.window)
	fs := l.entries[k]
	i := 0
	for i < len(fs) && !fs[i].After(corte) {
		i++
	}
	if i > 0 {
		fs = fs[i:]
		if len(fs) == 0 {
			delete(l.entries, k)
		} else {
			l.entries[k] = fs
		}
	}
	return fs
}

// abrirEspaco garante que cabe mais uma chave (mu já travado).
func (l *FailureLimiter) abrirEspaco() {
	if len(l.entries) < maxChaves {
		return
	}
	agora := l.now()
	if agora.Sub(l.ultimaVarrida) >= intervaloVarredura {
		l.ultimaVarrida = agora
		corte := agora.Add(-l.window)
		for k, fs := range l.entries {
			if len(fs) == 0 || !fs[len(fs)-1].After(corte) {
				delete(l.entries, k)
			}
		}
	}
	// Ainda cheio (ataque com muitas chaves ativas): descarta uma qualquer.
	for k := range l.entries {
		if len(l.entries) < maxChaves {
			break
		}
		delete(l.entries, k)
	}
}

// Reserve tenta consumir uma tentativa. Se a chave ainda tem cota, registra a
// tentativa e devolve (true, 0). Se está bloqueada, NÃO registra e devolve
// (false, espera) — a espera alimenta o cabeçalho Retry-After.
// Um *FailureLimiter nil nunca bloqueia.
func (l *FailureLimiter) Reserve(key string) (bool, time.Duration) {
	if l == nil {
		return true, 0
	}
	k := chave(key)
	l.mu.Lock()
	defer l.mu.Unlock()
	fs := l.recentes(k)
	if len(fs) >= l.max {
		// Bloqueada até a tentativa mais antiga que ainda conta sair da janela.
		espera := fs[len(fs)-l.max].Add(l.window).Sub(l.now())
		if espera < time.Second {
			espera = time.Second
		}
		return false, espera
	}
	if len(fs) == 0 {
		l.abrirEspaco()
	}
	l.entries[k] = append(fs, l.now())
	return true, 0
}

// Refund devolve a tentativa mais recente da chave (ex.: o erro não foi de
// credencial e não deve esgotar a cota).
func (l *FailureLimiter) Refund(key string) {
	if l == nil {
		return
	}
	k := chave(key)
	l.mu.Lock()
	defer l.mu.Unlock()
	fs := l.entries[k]
	switch {
	case len(fs) > 1:
		l.entries[k] = fs[:len(fs)-1]
	case len(fs) == 1:
		delete(l.entries, k)
	}
}

// Reset zera as tentativas da chave (sucesso).
func (l *FailureLimiter) Reset(key string) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.entries, chave(key))
}
