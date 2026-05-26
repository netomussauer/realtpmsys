"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { AtletaFilterBar } from "@/features/atletas/components/atleta-filter-bar";
import { AtletaTable } from "@/features/atletas/components/atleta-table";
import { useAtletas } from "@/features/atletas/hooks/use-atletas";
import type { AtletaFilter } from "@/features/atletas/types/atleta.types";

/**
 * /atletas — listagem paginada com filtros.
 *
 * Estado do filtro fica no componente (não na URL pra simplificar MVP).
 * Pode migrar pra `useSearchParams()` quando o usuário pedir share/refresh
 * mantendo estado (próxima iteração).
 */
export default function AtletasListPage() {
  const [filter, setFilter] = useState<AtletaFilter>({ page: 1, per_page: 20 });
  const { data, isLoading, isError, error, isFetching } = useAtletas(filter);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-primary tracking-wide">Atletas</h1>
          <p className="text-sm text-muted-foreground">
            Cadastro, busca e gestão de atletas.
          </p>
        </div>
        <Button asChild variant="default">
          <Link href="/atletas/novo">
            <Plus className="h-4 w-4" />
            Novo atleta
          </Link>
        </Button>
      </header>

      <AtletaFilterBar value={filter} onChange={setFilter} />

      {isError && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{(error as Error).message}</span>
        </div>
      )}

      <AtletaTable
        atletas={data?.data ?? []}
        pagination={data?.pagination ?? { total: 0, page: 1, per_page: 20 }}
        onPageChange={(page) => setFilter({ ...filter, page })}
        isLoading={isLoading || isFetching}
      />
    </div>
  );
}
