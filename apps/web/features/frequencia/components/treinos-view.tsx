"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { TurmaPicker } from "@/features/frequencia/components/turma-picker";
import { TreinoFilterBar } from "@/features/frequencia/components/treino-filter-bar";
import { TreinoTable } from "@/features/frequencia/components/treino-table";
import { TreinoForm } from "@/features/frequencia/components/treino-form";
import { useTreinos } from "@/features/frequencia/hooks/use-treinos";
import { useCriarTreino } from "@/features/frequencia/hooks/use-mutations";
import type { TreinoFilter } from "@/features/frequencia/types/frequencia.types";
import type { TreinoFormData } from "@/features/frequencia/schemas/treino.schema";

/**
 * Conteúdo client de /treinos — seleciona uma turma e lista os treinos
 * registrados, com filtro de período e ação de registrar novo treino.
 *
 * Aceita `?turma_id=` opcional na URL pra permitir link direto vindo de
 * outra página (ex.: /turmas/[id] → "Ver treinos"). Usa `useSearchParams`
 * só pra ler o valor inicial — depois disso a seleção de turma vive em
 * estado local (trocar de turma não reescreve a URL, mesmo padrão
 * pragmático de /turmas, que não usa useSearchParams pra filtros).
 *
 * Sem RBAC extra aqui: diferente de Turmas (onde só ADMIN escreve), neste
 * contexto o backend permite ADMIN+TREINADOR pra tudo (RequirePerfil não
 * distingue). O middleware já bloqueia RESPONSAVEL na rota /treinos
 * inteira — quem chega até aqui pode ver e lançar.
 */
export function TreinosView() {
  const searchParams = useSearchParams();
  const turmaIdFromUrl = searchParams.get("turma_id") ?? undefined;

  const [turmaId, setTurmaId] = useState<string | undefined>(turmaIdFromUrl);
  const [filter, setFilter] = useState<TreinoFilter>({ page: 1, per_page: 30 });
  const [showForm, setShowForm] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const treinosQuery = useTreinos(turmaId, filter);
  const criar = useCriarTreino(turmaId ?? "");

  const handleTurmaChange = (id: string) => {
    setTurmaId(id || undefined);
    setFilter({ page: 1, per_page: 30 });
    setShowForm(false);
    setServerError(null);
  };

  const onSubmitTreino = async (data: TreinoFormData) => {
    setServerError(null);
    try {
      await criar.mutateAsync(data);
      setShowForm(false);
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-primary tracking-wide">Treinos</h1>
          <p className="text-sm text-muted-foreground">
            Selecione uma turma para ver os treinos registrados e lançar frequência.
          </p>
        </div>
        {turmaId && !showForm && (
          <Button variant="default" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Registrar treino
          </Button>
        )}
      </header>

      <TurmaPicker value={turmaId} onChange={handleTurmaChange} />

      {!turmaId && (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <p className="font-display text-xl text-primary">Selecione uma turma</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Escolha uma turma acima para ver os treinos registrados.
          </p>
        </div>
      )}

      {turmaId && (
        <>
          {showForm && (
            <div className="rounded-md border border-border bg-muted/20 p-4">
              <TreinoForm
                serverError={serverError}
                isSubmitting={criar.isPending}
                onSubmit={onSubmitTreino}
                onCancel={() => {
                  setShowForm(false);
                  setServerError(null);
                }}
              />
            </div>
          )}

          <TreinoFilterBar value={filter} onChange={setFilter} />

          {treinosQuery.isError && (
            <div role="alert" className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{(treinosQuery.error as Error).message}</span>
            </div>
          )}

          <TreinoTable
            turmaId={turmaId}
            treinos={treinosQuery.data?.data ?? []}
            pagination={treinosQuery.data?.pagination ?? { total: 0, page: 1, per_page: 30 }}
            onPageChange={(page) => setFilter((f) => ({ ...f, page }))}
            isLoading={treinosQuery.isLoading || treinosQuery.isFetching}
          />
        </>
      )}
    </div>
  );
}
