import { cn } from "@/shared/lib/utils";
import type { MensalidadeStatus } from "@/features/financeiro/types/financeiro.types";

const styles: Record<MensalidadeStatus, string> = {
  PENDENTE: "bg-muted text-muted-foreground border-border",
  PAGO: "bg-green-100 text-green-900 border-green-200",
  VENCIDO: "bg-destructive/10 text-destructive border-destructive/30",
  CANCELADO: "bg-zinc-300 text-zinc-800 border-zinc-400",
  ISENTO: "bg-blue-100 text-blue-900 border-blue-200",
};

const labels: Record<MensalidadeStatus, string> = {
  PENDENTE: "Pendente",
  PAGO: "Pago",
  VENCIDO: "Vencido",
  CANCELADO: "Cancelado",
  ISENTO: "Isento",
};

interface StatusBadgeProps {
  status: MensalidadeStatus;
  className?: string;
}

/**
 * Badge que mostra o status da mensalidade com cor semântica (mesmo padrão
 * visual de features/turmas/components/status-badge.tsx e
 * features/frequencia/components/presenca-badge.tsx).
 */
export function MensalidadeStatusBadge({ status, className }: StatusBadgeProps) {
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
