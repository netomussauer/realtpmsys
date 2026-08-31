import { cn } from "@/shared/lib/utils";
import type { TurmaStatus } from "@/features/turmas/types/turma.types";

const styles: Record<TurmaStatus, string> = {
  ATIVA: "bg-accent/15 text-accent-foreground border-accent/40",
  ENCERRADA: "bg-muted text-muted-foreground border-border",
  SUSPENSA: "bg-yellow-100 text-yellow-900 border-yellow-200",
};

const labels: Record<TurmaStatus, string> = {
  ATIVA: "Ativa",
  ENCERRADA: "Encerrada",
  SUSPENSA: "Suspensa",
};

interface StatusBadgeProps {
  status: TurmaStatus;
  className?: string;
}

/**
 * Badge que mostra o status da turma com cor semântica.
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
