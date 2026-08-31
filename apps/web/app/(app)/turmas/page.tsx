"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { TurmaFilterBar } from "@/features/turmas/components/turma-filter-bar";
import { TurmaTable } from "@/features/turmas/components/turma-table";
import { useTurmas } from "@/features/turmas/hooks/use-turmas";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { TurmaFilter } from "@/features/turmas/types/turma.types";

/**
 * /turmas — listagem paginada com filtros por status e treinador.
 *
 * Estado do filtro fica no componente (mesmo padrão de /atletas — não usa
 * useSearchParams pra simplificar o MVP).
 */
export default function TurmasListPage() {
  const [filter, setFilter] = useState<TurmaFilter>({ page: 1, per_page: 20 });
  const { data, isLoading, isError, error, isFetching } = useTurmas(filter);
  const canManage = usePermission(["ADMIN"]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-primary tracking-wide">Turmas</h1>
          <p className="text-sm text-muted-foreground">
            Gestão de turmas, horários e matrículas.
          </p>
        </div>
        {canManage && (
          <Button asChild variant="default">
            <Link href="/turmas/novo">
              <Plus className="h-4 w-4" />
              Nova turma
            </Link>
          </Button>
        )}
      </header>

      <TurmaFilterBar value={filter} onChange={setFilter} />

      {isError && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{(error as Error).message}</span>
        </div>
      )}

      <TurmaTable
        turmas={data?.data ?? []}
        pagination={data?.pagination ?? { total: 0, page: 1, per_page: 20 }}
        onPageChange={(page) => setFilter({ ...filter, page })}
        isLoading={isLoading || isFetching}
      />
    </div>
  );
}
