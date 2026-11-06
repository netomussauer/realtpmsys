import { cn } from "@/shared/lib/utils";
import type { Perfil } from "@/features/contas/types/conta.types";

const base =
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider";

const perfilStyles: Record<Perfil, string> = {
  ADMIN: "bg-primary/10 text-primary border-primary/30",
  TREINADOR: "bg-accent/15 text-accent-foreground border-accent/40",
  RESPONSAVEL: "bg-muted text-muted-foreground border-border",
};

export const PERFIL_LABELS: Record<Perfil, string> = {
  ADMIN: "Administrador",
  TREINADOR: "Treinador",
  RESPONSAVEL: "Responsável",
};

export function PerfilBadge({ perfil, className }: { perfil: Perfil; className?: string }) {
  return <span className={cn(base, perfilStyles[perfil], className)}>{PERFIL_LABELS[perfil]}</span>;
}

/** Ativa / Inativa. */
export function StatusContaBadge({ ativo, className }: { ativo: boolean; className?: string }) {
  return (
    <span
      className={cn(
        base,
        ativo
          ? "bg-accent/15 text-accent-foreground border-accent/40"
          : "bg-muted text-muted-foreground border-border",
        className,
      )}
    >
      {ativo ? "Ativa" : "Inativa"}
    </span>
  );
}

/** Aviso de senha temporária ainda não trocada. */
export function SenhaTemporariaBadge({ className }: { className?: string }) {
  return (
    <span className={cn(base, "bg-yellow-100 text-yellow-900 border-yellow-200", className)}>
      Senha temporária
    </span>
  );
}
