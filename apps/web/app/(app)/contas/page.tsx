"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, AlertCircle, ShieldAlert } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ContaFilterBar } from "@/features/contas/components/conta-filter-bar";
import { ContaTable } from "@/features/contas/components/conta-table";
import { useContas } from "@/features/contas/hooks/use-contas";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { ContaFilter } from "@/features/contas/types/conta.types";

/**
 * /contas — gestão de contas de acesso (somente ADMIN).
 *
 * Defesa em profundidade: o middleware Next redireciona não-admins e o
 * backend responde 403 em /usuarios. A checagem aqui evita mostrar a tela a
 * quem não é admin caso o middleware seja contornado.
 */
export default function ContasListPage() {
  const [filter, setFilter] = useState<ContaFilter>({ page: 1, per_page: 20 });
  const isAdmin = usePermission(["ADMIN"]);
  const { data, isLoading, isError, error, isFetching } = useContas(filter);

  if (!isAdmin) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-6 text-destructive">
        <ShieldAlert className="mr-2 inline h-5 w-5" />
        Apenas administradores podem gerenciar contas.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-primary tracking-wide">Contas</h1>
          <p className="text-sm text-muted-foreground">
            Quem tem acesso ao sistema: criar contas, definir perfis e controlar o acesso.
          </p>
        </div>
        <Button asChild variant="default">
          <Link href="/contas/nova">
            <Plus className="h-4 w-4" />
            Nova conta
          </Link>
        </Button>
      </header>

      <ContaFilterBar value={filter} onChange={setFilter} />

      {isError && (
        <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{(error as Error).message}</span>
        </div>
      )}

      <ContaTable
        contas={data?.data ?? []}
        pagination={data?.pagination ?? { total: 0, page: 1, per_page: 20 }}
        onPageChange={(page) => setFilter({ ...filter, page })}
        isLoading={isLoading || isFetching}
      />
    </div>
  );
}
