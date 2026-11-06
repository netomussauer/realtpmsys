// Package ratelimit limita tentativas de autenticação malsucedidas.
//
// É um limitador de FALHAS (não de requisições): só as tentativas que erram a
// credencial contam, e um sucesso zera o contador. Fica em memória do
// processo — o backend roda com 1 réplica; com mais, o limite efetivo
// multiplica pelo número de réplicas (ainda útil, só menos estrito).
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
	"sync"
	"time"
)

// maxChaves é o teto de chaves rastreadas; ao atingi-lo, entradas vencidas
// são varridas (evita crescimento sem limite sob ataque com e-mails aleatórios).
const maxChaves = 10000

type FailureLimiter struct {
	mu      sync.Mutex
	max     int
	window  time.Duration
	now     func() time.Time
	entries map[string][]time.Time
}

// New cria um limitador que bloqueia a chave após `max` falhas dentro de
// `window`. O bloqueio dura até a falha mais antiga sair da janela.
func New(max int, window time.Duration) *FailureLimiter {
	return &FailureLimiter{
		max:     max,
		window:  window,
		now:     time.Now,
		entries: make(map[string][]time.Time),
	}
}

// recentes devolve as falhas ainda dentro da janela (mu já travado).
func (l *FailureLimiter) recentes(key string) []time.Time {
	corte := l.now().Add(-l.window)
	fs := l.entries[key]
	i := 0
	for i < len(fs) && !fs[i].After(corte) {
		i++
	}
	if i > 0 {
		fs = fs[i:]
		if len(fs) == 0 {
			delete(l.entries, key)
		} else {
			l.entries[key] = fs
		}
	}
	return fs
}

// Allow informa se a chave pode tentar. Se bloqueada, devolve quanto falta
// para a próxima tentativa ser aceita (para o cabeçalho Retry-After).
// Um *FailureLimiter nil nunca bloqueia.
func (l *FailureLimiter) Allow(key string) (bool, time.Duration) {
	if l == nil {
		return true, 0
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	fs := l.recentes(key)
	if len(fs) < l.max {
		return true, 0
	}
	// Bloqueada até a falha mais antiga que ainda conta sair da janela.
	espera := fs[len(fs)-l.max].Add(l.window).Sub(l.now())
	if espera < time.Second {
		espera = time.Second
	}
	return false, espera
}

// Fail registra uma tentativa malsucedida.
func (l *FailureLimiter) Fail(key string) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	if len(l.entries) >= maxChaves {
		corte := l.now().Add(-l.window)
		for k, fs := range l.entries {
			if len(fs) == 0 || !fs[len(fs)-1].After(corte) {
				delete(l.entries, k)
			}
		}
	}
	fs := l.recentes(key)
	l.entries[key] = append(fs, l.now())
}

// Reset zera as falhas da chave (login bem-sucedido).
func (l *FailureLimiter) Reset(key string) {
	if l == nil {
		return
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.entries, key)
}
