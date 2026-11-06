"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { ContaDTO } from "@/features/contas/types/conta.types";
import { Button } from "@/shared/components/ui/button";
import {
  PerfilBadge,
  SenhaTemporariaBadge,
  StatusContaBadge,
} from "@/features/contas/components/conta-badges";

interface ContaTableProps {
  contas: ContaDTO[];
  pagination: { total: number; page: number; per_page: number };
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

/** Tabela de contas com paginação. Ações de escrita ficam na página de detalhe. */
export function ContaTable({ contas, pagination, onPageChange, isLoading }: ContaTableProps) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.per_page));
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.per_page + 1;
  const end = Math.min(pagination.page * pagination.per_page, pagination.total);

  if (isLoading && contas.length === 0) {
    return <TableSkeleton />;
  }

  if (contas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="font-display text-xl text-primary">Nenhuma conta encontrada</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste os filtros ou crie uma nova conta.
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
              <th className="px-4 py-3 font-medium">Conta</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contas.map((c) => (
              <tr key={c.id} className="text-sm hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/contas/${c.id}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {c.nome || c.email}
                  </Link>
                  {c.nome && <p className="text-xs text-muted-foreground">{c.email}</p>}
                </td>
                <td className="px-4 py-3">
                  <PerfilBadge perfil={c.perfil} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusContaBadge ativo={c.ativo} />
                    {c.deve_trocar_senha && <SenhaTemporariaBadge />}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Button asChild size="icon" variant="ghost" aria-label={`Ver detalhes de ${c.nome || c.email}`}>
                      <Link href={`/contas/${c.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
    <div className="rounded-lg border border-border bg-card" aria-busy="true">
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
