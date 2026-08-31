"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye, Pencil } from "lucide-react";
import type { TurmaDTO } from "@/features/turmas/types/turma.types";
import { Button } from "@/shared/components/ui/button";
import { usePermission } from "@/features/auth/hooks/use-permission";
import { StatusBadge } from "./status-badge";

interface TurmaTableProps {
  turmas: TurmaDTO[];
  pagination: { total: number; page: number; per_page: number };
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

/**
 * Tabela de turmas com paginação. Read-only — ações de escrita (editar,
 * mudar status, matricular) ficam na página de detalhe.
 *
 * Não exibe "vagas disponíveis": o backend não retorna esse dado na
 * listagem (e calculá-lo exigiria 1 fetch extra de matrículas por linha —
 * caro demais pra uma tabela paginada). É exibido apenas no detalhe da
 * turma, onde as matrículas já são carregadas de qualquer forma.
 */
export function TurmaTable({
  turmas,
  pagination,
  onPageChange,
  isLoading,
}: TurmaTableProps) {
  const canManage = usePermission(["ADMIN"]);
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.per_page));
  const start = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.per_page + 1;
  const end = Math.min(pagination.page * pagination.per_page, pagination.total);

  if (isLoading && turmas.length === 0) {
    return <TableSkeleton />;
  }

  if (turmas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="font-display text-xl text-primary">Nenhuma turma encontrada</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste os filtros ou cadastre uma nova turma.
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
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Faixa etária</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Capacidade</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Horários</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {turmas.map((t) => (
              <tr key={t.id} className="text-sm hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/turmas/${t.id}`}
                    className="font-medium text-foreground hover:text-accent-foreground hover:underline"
                  >
                    {t.nome}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {t.faixa_etaria_min}–{t.faixa_etaria_max} anos
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {t.capacidade_max} vagas
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={t.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {t.horarios.length === 0
                    ? "—"
                    : `${t.horarios.length} horário${t.horarios.length > 1 ? "s" : ""}`}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Button asChild size="icon" variant="ghost" aria-label="Ver detalhes">
                      <Link href={`/turmas/${t.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    {canManage && (
                      <Button asChild size="icon" variant="ghost" aria-label="Editar">
                        <Link href={`/turmas/${t.id}/editar`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
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
