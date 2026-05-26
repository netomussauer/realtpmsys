import { cn } from "@/shared/lib/utils";
import type { AtletaStatus } from "@/features/atletas/types/atleta.types";

const styles: Record<AtletaStatus, string> = {
  ATIVO: "bg-accent/15 text-accent-foreground border-accent/40",
  INATIVO: "bg-muted text-muted-foreground border-border",
  SUSPENSO: "bg-yellow-100 text-yellow-900 border-yellow-200",
};

const labels: Record<AtletaStatus, string> = {
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  SUSPENSO: "Suspenso",
};

interface StatusBadgeProps {
  status: AtletaStatus;
  className?: string;
}

/**
 * Badge que mostra o status do atleta com cor semântica.
 * Usado em tabela, card de detalhe e qualquer lugar que precise
 * representar o status visualmente.
 */
export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        styles[status],
        className,
      )}
    >
      {labels[status]}
    </span>
  );
}
