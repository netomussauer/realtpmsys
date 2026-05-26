"use client";

import { useState } from "react";
import { Ban, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useMudarStatusAtleta } from "@/features/atletas/hooks/use-mutations";
import type {
  AtletaStatus,
  AcaoStatus,
} from "@/features/atletas/types/atleta.types";

interface StatusActionsProps {
  atletaId: string;
  statusAtual: AtletaStatus;
}

/**
 * Botões de mudança de status — Inativar / Suspender / Reativar.
 *
 * Habilitação por status atual:
 *   - ATIVO    → Suspender, Inativar
 *   - SUSPENSO → Reativar, Inativar
 *   - INATIVO  → Reativar
 *
 * Confirm dialog nativo (window.confirm) — pragmático pra MVP. Trocar
 * por modal customizado se UX exigir (raro pra ação de gestor).
 */
export function StatusActions({ atletaId, statusAtual }: StatusActionsProps) {
  const mutation = useMudarStatusAtleta();
  const [pendingAcao, setPendingAcao] = useState<AcaoStatus | null>(null);

  const handle = (acao: AcaoStatus, prompt: string) => {
    if (!window.confirm(prompt)) return;
    setPendingAcao(acao);
    mutation.mutate(
      { id: atletaId, acao },
      { onSettled: () => setPendingAcao(null) },
    );
  };

  const disable = mutation.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      {statusAtual !== "ATIVO" && (
        <Button
          variant="default"
          size="sm"
          disabled={disable}
          onClick={() => handle("reativar", "Reativar atleta?")}
        >
          <PlayCircle className="h-4 w-4" />
          {pendingAcao === "reativar" ? "Reativando..." : "Reativar"}
        </Button>
      )}
      {statusAtual === "ATIVO" && (
        <Button
          variant="outline"
          size="sm"
          disabled={disable}
          onClick={() =>
            handle("suspender", "Suspender atleta? Ele poderá ser reativado depois.")
          }
        >
          <PauseCircle className="h-4 w-4" />
          {pendingAcao === "suspender" ? "Suspendendo..." : "Suspender"}
        </Button>
      )}
      {statusAtual !== "INATIVO" && (
        <Button
          variant="destructive"
          size="sm"
          disabled={disable}
          onClick={() =>
            handle("inativar", "Inativar atleta? Pode ser reativado depois.")
          }
        >
          <Ban className="h-4 w-4" />
          {pendingAcao === "inativar" ? "Inativando..." : "Inativar"}
        </Button>
      )}
    </div>
  );
}
