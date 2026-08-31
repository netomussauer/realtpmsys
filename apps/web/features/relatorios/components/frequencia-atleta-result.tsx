import { cn } from "@/shared/lib/utils";
import { formatDateBR } from "@/shared/lib/format";
import type { FrequenciaAtletaResponse } from "@/features/relatorios/types/relatorio.types";

interface FrequenciaAtletaResultProps {
  resultado: FrequenciaAtletaResponse | undefined;
  isLoading?: boolean;
}

const TILES = [
  { key: "presentes", label: "Presenças", className: "text-green-700" },
  { key: "ausentes", label: "Faltas", className: "text-destructive" },
  { key: "justificados", label: "Justificadas", className: "text-yellow-700" },
  { key: "total", label: "Total de treinos", className: "text-foreground" },
] as const;

/**
 * Resultado do relatório de frequência por atleta — 4 números (cards) +
 * barra/percentual da taxa de presença, já calculados pelo backend
 * (`GET /relatorios/frequencia/{atletaId}`, resumo único, não é lista).
 *
 * `taxa_presenca_pc` considera só PRESENTE como presença efetiva —
 * JUSTIFICADO conta em `total` mas não na taxa. Não validamos essa regra
 * aqui (é do backend); só explicamos na legenda pra não estranhar o
 * número quando presentes + justificados < total.
 */
export function FrequenciaAtletaResult({ resultado, isLoading }: FrequenciaAtletaResultProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => (
          <div key={t.key} className="rounded-lg border border-border bg-card p-4">
            <div className="h-3 w-20 rounded bg-muted animate-pulse" />
            <div className="mt-2 h-7 w-12 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!resultado) return null;

  const taxa = Math.min(100, Math.max(0, resultado.taxa_presenca_pc));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => (
          <div key={t.key} className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t.label}
            </p>
            <p className={cn("mt-1 font-display text-2xl", t.className)}>{resultado[t.key]}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Taxa de presença
          </p>
          <span className="font-display text-lg text-primary">
            {resultado.taxa_presenca_pc.toFixed(1)}%
          </span>
        </div>
        <div
          className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={Math.round(taxa)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Taxa de presença"
        >
          {/* Largura dinâmica derivada do dado da API — token não cobre esse
              valor contínuo (0-100%), exceção explícita da Regra 3. */}
          <div className="h-full rounded-full bg-primary" style={{ width: `${taxa}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Período de {formatDateBR(resultado.data_inicio)} a {formatDateBR(resultado.data_fim)}.
          A taxa considera apenas presenças efetivas — faltas justificadas contam no total, mas
          não na taxa.
        </p>
      </div>
    </div>
  );
}
