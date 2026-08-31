"use client";

import { Ban, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { useAtleta } from "@/features/atletas/hooks/use-atleta";
import { useCancelarMatricula } from "@/features/turmas/hooks/use-mutations";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { MatriculaDTO } from "@/features/turmas/types/turma.types";
import { MatriculaStatusBadge } from "./matricula-status-badge";

interface MatriculaTableProps {
  turmaId: string;
  matriculas: MatriculaDTO[];
  pagination: { total: number; page: number; per_page: number };
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

/**
 * Tabela de matrículas de uma turma, com paginação (mesmo padrão de
 * `atleta-table.tsx`). Achado de code-review: a versão anterior deste
 * componente ignorava `pagination`/`onPageChange` e sempre buscava
 * page=1/per_page=20 fixo — turmas com mais de 20 matrículas (comum ao
 * acumular histórico CANCELADA/TRANSFERIDA) escondiam o resto sem
 * nenhuma indicação de que a lista estava truncada.
 *
 * `MatriculaDTO` não traz `atleta_nome` (o backend não devolve esse campo
 * apesar do que o openapi.yaml desatualizado documenta) — cada linha
 * resolve o nome do atleta com `useAtleta(atleta_id)`, reaproveitando o
 * hook/cache já existente da feature atletas (`["atletas","detail",id]`).
 * Se o usuário já visitou a página do atleta, o nome aparece
 * instantaneamente (cache hit); senão, 1 fetch por linha visível.
 */
export function MatriculaTable({
  turmaId,
  matriculas,
  pagination,
  onPageChange,
  isLoading,
}: MatriculaTableProps) {
  const canManage = usePermission(["ADMIN"]);
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.per_page));

  if (isLoading && matriculas.length === 0) {
    return <p className="text-sm text-muted-foreground">Carregando matrículas...</p>;
  }

  if (matriculas.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma matrícula encontrada.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/40">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Atleta</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Início</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Fim</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage && <th className="px-4 py-3 font-medium text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {matriculas.map((m) => (
              <MatriculaRow key={m.id} turmaId={turmaId} matricula={m} canManage={canManage} />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page <= 1 || isLoading}
            onClick={() => onPageChange(pagination.page - 1)}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-muted-foreground">
            Página <strong className="text-foreground">{pagination.page}</strong> de{" "}
            <strong className="text-foreground">{totalPages}</strong>
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page >= totalPages || isLoading}
            onClick={() => onPageChange(pagination.page + 1)}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

function MatriculaRow({
  turmaId,
  matricula,
  canManage,
}: {
  turmaId: string;
  matricula: MatriculaDTO;
  canManage: boolean;
}) {
  const atletaQuery = useAtleta(matricula.atleta_id);
  const cancelar = useCancelarMatricula(turmaId);

  const handleCancelar = () => {
    if (!window.confirm("Cancelar esta matrícula?")) return;
    cancelar.mutate(matricula.id);
  };

  return (
    <tr className="text-sm hover:bg-muted/30">
      <td className="px-4 py-3 font-medium text-foreground">
        {atletaQuery.isLoading
          ? "Carregando..."
          : (atletaQuery.data?.nome ?? matricula.atleta_id)}
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
        {formatDate(matricula.data_inicio)}
      </td>
      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
        {matricula.data_fim ? formatDate(matricula.data_fim) : "—"}
      </td>
      <td className="px-4 py-3">
        <MatriculaStatusBadge status={matricula.status} />
      </td>
      {canManage && (
        <td className="px-4 py-3 text-right">
          {matricula.status === "ATIVA" && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Cancelar matrícula"
              disabled={cancelar.isPending}
              onClick={handleCancelar}
            >
              <Ban className="h-4 w-4" />
            </Button>
          )}
        </td>
      )}
    </tr>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR");
  } catch {
    return iso;
  }
}
