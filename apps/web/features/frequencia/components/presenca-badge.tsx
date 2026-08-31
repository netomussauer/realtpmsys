import { cn } from "@/shared/lib/utils";
import type { Presenca } from "@/features/frequencia/types/frequencia.types";

const styles: Record<Presenca, string> = {
  PRESENTE: "bg-green-100 text-green-900 border-green-200",
  AUSENTE: "bg-destructive/10 text-destructive border-destructive/30",
  JUSTIFICADO: "bg-yellow-100 text-yellow-900 border-yellow-200",
};

const labels: Record<Presenca, string> = {
  PRESENTE: "Presente",
  AUSENTE: "Ausente",
  JUSTIFICADO: "Justificado",
};

interface PresencaBadgeProps {
  presenca: Presenca;
  className?: string;
}

/**
 * Badge que mostra o status de presença do atleta num treino, com cor
 * semântica (mesmo padrão visual de features/turmas/components/status-badge.tsx).
 */
export function PresencaBadge({ presenca, className }: PresencaBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider",
        styles[presenca],
        className,
      )}
    >
      {labels[presenca]}
    </span>
  );
}
