"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { MensalidadeDTO } from "@/features/financeiro/types/financeiro.types";
import { MensalidadeRow } from "./mensalidade-row";

interface MensalidadeTableProps {
  mensalidades: MensalidadeDTO[];
  pagination: { total: number; page: number; per_page: number };
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

/**
 * Tabela de mensalidades com paginação (mesmo padrão de
 * features/turmas/components/turma-table.tsx). Ações de escrita
 * (pagar/cancelar) só aparecem com `usePermission(["ADMIN"])` — RESPONSAVEL
 * é só leitura (mensalidades pagas fora do sistema são registradas por um
 * ADMIN, não pelo próprio responsável).
 */
export function MensalidadeTable({
  mensalidades,
  pagination,
  onPageChange,
  isLoading,
}: MensalidadeTableProps) {
  const canManage = usePermission(["ADMIN"]);
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.per_page));
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.per_page + 1;
  const end = Math.min(pagination.page * pagination.per_page, pagination.total);
  const colSpan = canManage ? 6 : 5;

  if (isLoading && mensalidades.length === 0) {
    return <TableSkeleton />;
  }

  if (mensalidades.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="font-display text-xl text-primary">Nenhuma mensalidade encontrada</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste os filtros{canManage ? " ou gere as mensalidades do mês" : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full">
          <thead className="border-b border-border bg-muted/40">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3 font-medium">Atleta</th>
              <th className="px-4 py-3 font-medium">Competência</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Vencimento</th>
              <th className="px-4 py-3 font-medium">Valor</th>
              <th className="px-4 py-3 font-medium">Status</th>
              {canManage && <th className="px-4 py-3 font-medium text-right">Ações</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {mensalidades.map((m) => (
              <MensalidadeRow key={m.id} mensalidade={m} canManage={canManage} colSpan={colSpan} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex flex-col items-center justify-between gap-3 text-sm sm:flex-row">
        <p className="text-muted-foreground">
          Mostrando <strong className="text-foreground">{start}</strong>–
          <strong className="text-foreground">{end}</strong> de{" "}
          <strong className="text-foreground">{pagination.total}</strong>
        </p>
        <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/40 p-3">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="divide-y divide-border">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
