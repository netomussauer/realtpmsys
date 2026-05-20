// Package metrics expõe métricas Prometheus da aplicação.
//
// Duas famílias de métricas hoje:
//
//   - HTTP RED: request rate, error rate e duração (histograma) por
//     método/path/status — usado para os SLOs do SDD §5.3.
//   - pgx pool: saturation do pool de conexões — útil para detectar
//     queries lentas saturando conexões antes do timeout aparecer.
//
// Cardinalidade: o label `path` usa o RoutePattern do chi (ex.:
// `/api/v1/atletas/{id}`), não o path real. Requests sem rota associada
// (404 vindos do mux) caem em `path="unmatched"` para evitar explosão.
package metrics

import (
	"strconv"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/prometheus/client_golang/prometheus"
)

const (
	namespace = "realtpmsys"
	subsystem = "http"
)

// HTTP métrics — registradas no Default registry para que o handler
// padrão do promhttp as exponha automaticamente.
var (
	HTTPRequestsTotal = prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Namespace: namespace,
			Subsystem: subsystem,
			Name:      "requests_total",
			Help:      "Contagem total de requests HTTP por método, path e status.",
		},
		[]string{"method", "path", "status"},
	)

	// Buckets escolhidos para APIs internas: ~5ms até 5s. Cobrem a faixa
	// dos SLOs do SDD (p99 < 200ms login, < 500ms financeiro, < 2s relatórios)
	// sem desperdiçar memória com buckets > 5s que nunca atingiríamos.
	HTTPRequestDuration = prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Namespace: namespace,
			Subsystem: subsystem,
			Name:      "request_duration_seconds",
			Help:      "Histograma de latência por método, path e status.",
			Buckets:   []float64{0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5},
		},
		[]string{"method", "path", "status"},
	)
)

// MustRegister registra todas as métricas no registry padrão. Deve ser
// chamado uma única vez durante a inicialização. Pânico se uma métrica
// for registrada duas vezes (indica bug, não condição de runtime).
func MustRegister() {
	prometheus.MustRegister(HTTPRequestsTotal, HTTPRequestDuration)
}

// StatusBucket agrupa status individuais em famílias (2xx, 3xx, 4xx, 5xx)
// para reduzir cardinalidade quando o painel/alerta não precisa do código
// exato. Útil para o label `status` do counter — alguns dashboards
// preferem mostrar `2xx`/`4xx` em vez de cada código.
//
// Hoje NÃO é usado pelo middleware (gravamos o código exato pra dar
// flexibilidade no PromQL). Exposto para callers que queiram agrupar.
func StatusBucket(status int) string {
	switch {
	case status >= 500:
		return "5xx"
	case status >= 400:
		return "4xx"
	case status >= 300:
		return "3xx"
	case status >= 200:
		return "2xx"
	default:
		return strconv.Itoa(status)
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// pgx pool — Collector idiomático (Describe/Collect chamados pelo registry
// a cada scrape, sem goroutine de polling).
// ─────────────────────────────────────────────────────────────────────────────

type poolCollector struct {
	pool *pgxpool.Pool

	acquireCount       *prometheus.Desc
	acquireDuration    *prometheus.Desc
	acquiredConns      *prometheus.Desc
	idleConns          *prometheus.Desc
	totalConns         *prometheus.Desc
	maxConns           *prometheus.Desc
	emptyAcquireCount  *prometheus.Desc
	canceledAcquireCnt *prometheus.Desc
}

// RegisterPoolCollector cria um Collector que consulta `pool.Stat()` a
// cada scrape e o registra no Default registry. Não há goroutine — o
// custo é o de uma chamada in-memory por scrape do Prometheus.
func RegisterPoolCollector(pool *pgxpool.Pool) {
	prometheus.MustRegister(newPoolCollector(pool))
}

func newPoolCollector(pool *pgxpool.Pool) *poolCollector {
	const sub = "pgxpool"
	return &poolCollector{
		pool: pool,
		acquireCount: prometheus.NewDesc(
			prometheus.BuildFQName(namespace, sub, "acquire_total"),
			"Total de aquisições de conexão do pool desde o início.",
			nil, nil,
		),
		acquireDuration: prometheus.NewDesc(
			prometheus.BuildFQName(namespace, sub, "acquire_duration_seconds_total"),
			"Soma da duração de todas as aquisições (segundos). Use rate() para latência média.",
			nil, nil,
		),
		acquiredConns: prometheus.NewDesc(
			prometheus.BuildFQName(namespace, sub, "acquired_connections"),
			"Conexões atualmente em uso (acquired).",
			nil, nil,
		),
		idleConns: prometheus.NewDesc(
			prometheus.BuildFQName(namespace, sub, "idle_connections"),
			"Conexões ociosas no pool.",
			nil, nil,
		),
		totalConns: prometheus.NewDesc(
			prometheus.BuildFQName(namespace, sub, "total_connections"),
			"Total de conexões abertas (acquired + idle + construindo).",
			nil, nil,
		),
		maxConns: prometheus.NewDesc(
			prometheus.BuildFQName(namespace, sub, "max_connections"),
			"Limite configurado de conexões do pool.",
			nil, nil,
		),
		emptyAcquireCount: prometheus.NewDesc(
			prometheus.BuildFQName(namespace, sub, "empty_acquire_total"),
			"Aquisições que precisaram esperar (pool esvaziado). Alerta se crescer rápido.",
			nil, nil,
		),
		canceledAcquireCnt: prometheus.NewDesc(
			prometheus.BuildFQName(namespace, sub, "canceled_acquire_total"),
			"Aquisições canceladas por context (timeout do request).",
			nil, nil,
		),
	}
}

func (c *poolCollector) Describe(ch chan<- *prometheus.Desc) {
	ch <- c.acquireCount
	ch <- c.acquireDuration
	ch <- c.acquiredConns
	ch <- c.idleConns
	ch <- c.totalConns
	ch <- c.maxConns
	ch <- c.emptyAcquireCount
	ch <- c.canceledAcquireCnt
}

func (c *poolCollector) Collect(ch chan<- prometheus.Metric) {
	s := c.pool.Stat()
	ch <- prometheus.MustNewConstMetric(c.acquireCount, prometheus.CounterValue, float64(s.AcquireCount()))
	ch <- prometheus.MustNewConstMetric(c.acquireDuration, prometheus.CounterValue, s.AcquireDuration().Seconds())
	ch <- prometheus.MustNewConstMetric(c.acquiredConns, prometheus.GaugeValue, float64(s.AcquiredConns()))
	ch <- prometheus.MustNewConstMetric(c.idleConns, prometheus.GaugeValue, float64(s.IdleConns()))
	ch <- prometheus.MustNewConstMetric(c.totalConns, prometheus.GaugeValue, float64(s.TotalConns()))
	ch <- prometheus.MustNewConstMetric(c.maxConns, prometheus.GaugeValue, float64(s.MaxConns()))
	ch <- prometheus.MustNewConstMetric(c.emptyAcquireCount, prometheus.CounterValue, float64(s.EmptyAcquireCount()))
	ch <- prometheus.MustNewConstMetric(c.canceledAcquireCnt, prometheus.CounterValue, float64(s.CanceledAcquireCount()))
}
