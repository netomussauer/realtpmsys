import { cn } from "@/shared/lib/utils";
import { formatCurrencyBRL } from "@/shared/lib/format";
import type { MensalidadeResumo } from "@/features/financeiro/types/financeiro.types";

interface ResumoTilesProps {
  resumo: MensalidadeResumo | undefined;
  isLoading?: boolean;
}

const TILES: ReadonlyArray<{
  key: keyof MensalidadeResumo;
  label: string;
  valueClassName: string;
}> = [
  { key: "total_pendente", label: "Pendente", valueClassName: "text-foreground" },
  { key: "total_vencido", label: "Vencido", valueClassName: "text-destructive" },
  { key: "total_pago", label: "Pago", valueClassName: "text-green-700" },
];

/**
 * 3 stat tiles com o resumo financeiro já calculado pelo backend —
 * `GET /mensalidades` devolve `resumo` junto de `data`/`pagination`
 * (vide types/financeiro.types.ts). Não recalculamos nada client-side.
 */
export function ResumoTiles({ resumo, isLoading }: ResumoTilesProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {TILES.map((t) => (
        <div key={t.key} className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t.label}
          </p>
          <p className={cn("mt-1 font-display text-2xl", t.valueClassName)}>
            {isLoading || !resumo ? (
              <span className="inline-block h-7 w-24 animate-pulse rounded bg-muted align-middle" />
            ) : (
              formatCurrencyBRL(resumo[t.key])
            )}
          </p>
        </div>
      ))}
    </div>
  );
}
