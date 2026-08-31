import { cn } from "@/shared/lib/utils";
import { formatCurrencyBRL } from "@/shared/lib/format";
import type { InadimplenciaResumo } from "@/features/relatorios/types/relatorio.types";

interface InadimplenciaResumoTilesProps {
  resumo: InadimplenciaResumo | undefined;
  isLoading?: boolean;
}

/**
 * 3 stat tiles do resumo de inadimplência — mesmo padrão visual de
 * features/financeiro/components/resumo-tiles.tsx, mas com um shape
 * diferente (2 contadores + 1 valor monetário). `resumo` já vem calculado
 * pelo backend em `GET /relatorios/inadimplencia` — não recalculamos nada
 * client-side.
 */
export function InadimplenciaResumoTiles({ resumo, isLoading }: InadimplenciaResumoTilesProps) {
  const loading = isLoading || !resumo;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Mensalidades em aberto
        </p>
        <p className="mt-1 font-display text-2xl text-foreground">
          {loading ? <Skeleton /> : resumo.total_mensalidades}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Atletas inadimplentes
        </p>
        <p className="mt-1 font-display text-2xl text-foreground">
          {loading ? <Skeleton /> : resumo.total_atletas}
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Total devido
        </p>
        <p className={cn("mt-1 font-display text-2xl", loading ? "" : "text-destructive")}>
          {loading ? <Skeleton /> : formatCurrencyBRL(resumo.total_devido)}
        </p>
      </div>
    </div>
  );
}

function Skeleton() {
  return <span className="inline-block h-7 w-20 animate-pulse rounded bg-muted align-middle" />;
}
