import { cn } from "@/shared/lib/utils";
import type { MatriculaStatus } from "@/features/turmas/types/turma.types";

const styles: Record<MatriculaStatus, string> = {
  ATIVA: "bg-accent/15 text-accent-foreground border-accent/40",
  CANCELADA: "bg-destructive/10 text-destructive border-destructive/30",
  TRANSFERIDA: "bg-muted text-muted-foreground border-border",
};

const labels: Record<MatriculaStatus, string> = {
  ATIVA: "Ativa",
  CANCELADA: "Cancelada",
  TRANSFERIDA: "Transferida",
};

interface MatriculaStatusBadgeProps {
  status: MatriculaStatus;
  className?: string;
}

/** Badge que mostra o status da matrícula com cor semântica. */
export function MatriculaStatusBadge({ status, className }: MatriculaStatusBadgeProps) {
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
