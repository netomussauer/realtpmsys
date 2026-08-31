"use client";

import { useState } from "react";
import { Ban, PauseCircle, PlayCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useMudarStatusTurma } from "@/features/turmas/hooks/use-mutations";
import type {
  TurmaStatus,
  AcaoStatusTurma,
} from "@/features/turmas/types/turma.types";

interface StatusActionsProps {
  turmaId: string;
  statusAtual: TurmaStatus;
}

/**
 * Botões de transição de status da turma — Encerrar / Suspender / Reativar.
 *
 * Regras de transição (validadas no backend, replicadas aqui só pra UX):
 *   - ATIVA    → Suspender, Encerrar
 *   - SUSPENSA → Reativar (única transição possível)
 *   - ENCERRADA → sem transições (estado terminal)
 *
 * Confirm dialog nativo (window.confirm) — mesmo padrão pragmático de
 * features/atletas/components/status-actions.tsx.
 */
export function StatusActions({ turmaId, statusAtual }: StatusActionsProps) {
  const mutation = useMudarStatusTurma();
  const [pendingAcao, setPendingAcao] = useState<AcaoStatusTurma | null>(null);

  const handle = (acao: AcaoStatusTurma, prompt: string) => {
    if (!window.confirm(prompt)) return;
    setPendingAcao(acao);
    mutation.mutate(
      { id: turmaId, acao },
      { onSettled: () => setPendingAcao(null) },
    );
  };

  const disable = mutation.isPending;

  if (statusAtual === "ENCERRADA") {
    return (
      <p className="text-sm text-muted-foreground">
        Turma encerrada — não há mais transições de status disponíveis.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {statusAtual === "SUSPENSA" && (
        <Button
          variant="default"
          size="sm"
          disabled={disable}
          onClick={() => handle("reativar", "Reativar turma?")}
        >
          <PlayCircle className="h-4 w-4" />
          {pendingAcao === "reativar" ? "Reativando..." : "Reativar"}
        </Button>
      )}
      {statusAtual === "ATIVA" && (
        <Button
          variant="outline"
          size="sm"
          disabled={disable}
          onClick={() =>
            handle("suspender", "Suspender turma? Ela poderá ser reativada depois.")
          }
        >
          <PauseCircle className="h-4 w-4" />
          {pendingAcao === "suspender" ? "Suspendendo..." : "Suspender"}
        </Button>
      )}
      {statusAtual === "ATIVA" && (
        <Button
          variant="destructive"
          size="sm"
          disabled={disable}
          onClick={() =>
            handle("encerrar", "Encerrar turma? Esta ação é definitiva.")
          }
        >
          <Ban className="h-4 w-4" />
          {pendingAcao === "encerrar" ? "Encerrando..." : "Encerrar"}
        </Button>
      )}
    </div>
  );
}
