"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { TreinoDTO } from "@/features/frequencia/types/frequencia.types";
import { Button } from "@/shared/components/ui/button";
import { formatDateBR } from "@/shared/lib/format";

interface TreinoTableProps {
  turmaId: string;
  treinos: TreinoDTO[];
  pagination: { total: number; page: number; per_page: number };
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}

/**
 * Tabela de treinos de uma turma, com paginação (mesmo padrão de
 * turma-table.tsx). Cada linha lincka para `/treinos/{id}?turma_id={turmaId}`
 * — a página de detalhe PRECISA do `turma_id` na query string, pois não
 * existe `GET /treinos/{id}` (vide types/frequencia.types.ts).
 */
export function TreinoTable({
  turmaId,
  treinos,
  pagination,
  onPageChange,
  isLoading,
}: TreinoTableProps) {
  const totalPages = Math.max(1, Math.ceil(pagination.total / pagination.per_page));

  if (isLoading && treinos.length === 0) {
    return <TableSkeleton />;
  }

  if (treinos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="font-display text-xl text-primary">Nenhum treino encontrado</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste o filtro de período ou registre um novo treino para esta turma.
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
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium hidden md:table-cell">Horário</th>
              <th className="px-4 py-3 font-medium hidden lg:table-cell">Observação</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {treinos.map((t) => (
              <tr key={t.id} className="text-sm hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/treinos/${t.id}?turma_id=${turmaId}`}
                    className="font-medium text-foreground hover:text-accent-foreground hover:underline"
                  >
                    {formatDateBR(t.data_treino)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                  {t.hora_inicio && t.hora_fim ? `${t.hora_inicio}–${t.hora_fim}` : "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                  {t.observacao || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button asChild size="icon" variant="ghost" aria-label="Ver treino e lançar frequência">
                    <Link href={`/treinos/${t.id}?turma_id=${turmaId}`}>
                      <Eye className="h-4 w-4" />
                    </Link>
                  </Button>
                </td>
              </tr>
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
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
