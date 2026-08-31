"use client";

import { useState } from "react";
import { Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { ResumoTiles } from "@/features/financeiro/components/resumo-tiles";
import { MensalidadeFilterBar } from "@/features/financeiro/components/mensalidade-filter-bar";
import { MensalidadeTable } from "@/features/financeiro/components/mensalidade-table";
import { GerarMensalidadesForm } from "@/features/financeiro/components/gerar-mensalidades-form";
import { useMensalidades } from "@/features/financeiro/hooks/use-mensalidades";
import { useGerarMensalidades } from "@/features/financeiro/hooks/use-mutations";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { MensalidadeFilter } from "@/features/financeiro/types/financeiro.types";
import type { GerarMensalidadesFormData } from "@/features/financeiro/schemas/gerar-mensalidades.schema";

/**
 * /mensalidades — lista de mensalidades com resumo financeiro e ações.
 *
 * Perfis: ADMIN e RESPONSAVEL acessam (nav + middleware já bloqueiam
 * TREINADOR nesta rota — vide app-sidebar.tsx e middleware.ts, não
 * alterados aqui). RESPONSAVEL só vê leitura: sem filtro por atleta (o
 * backend ignora esse parâmetro pra esse perfil — vide
 * mensalidade-filter-bar.tsx) e sem os botões de pagar/cancelar/gerar
 * (mensalidades são pagas fora do sistema; só ADMIN registra).
 *
 * Estado do filtro fica no componente (mesmo padrão de /turmas e
 * /atletas — sem useSearchParams, MVP pragmático já estabelecido no
 * projeto).
 */
export default function MensalidadesPage() {
  const isAdmin = usePermission(["ADMIN"]);
  const [filter, setFilter] = useState<MensalidadeFilter>({ page: 1, per_page: 20 });
  const [showGerarForm, setShowGerarForm] = useState(false);
  const [gerarError, setGerarError] = useState<string | null>(null);
  const [gerarResultado, setGerarResultado] = useState<string | null>(null);

  const { data, isLoading, isError, error, isFetching } = useMensalidades(filter);
  const gerar = useGerarMensalidades();

  const onSubmitGerar = async (values: GerarMensalidadesFormData) => {
    setGerarError(null);
    setGerarResultado(null);
    try {
      const resultado = await gerar.mutateAsync(values);
      setGerarResultado(
        `${resultado.geradas} geradas, ${resultado.ignoradas} já existiam, ${resultado.com_erro} com erro.`,
      );
      setShowGerarForm(false);
    } catch (e) {
      setGerarError((e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-primary tracking-wide">Mensalidades</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Acompanhamento e cobrança das mensalidades dos atletas."
              : "Situação financeira das mensalidades dos seus atletas."}
          </p>
        </div>
        {isAdmin && !showGerarForm && (
          <Button variant="default" onClick={() => setShowGerarForm(true)}>
            <Plus className="h-4 w-4" />
            Gerar mensalidades do mês
          </Button>
        )}
      </header>

      {isAdmin && showGerarForm && (
        <div className="rounded-md border border-border bg-muted/20 p-4">
          <GerarMensalidadesForm
            serverError={gerarError}
            isSubmitting={gerar.isPending}
            onSubmit={onSubmitGerar}
            onCancel={() => {
              setShowGerarForm(false);
              setGerarError(null);
            }}
          />
        </div>
      )}

      {gerarResultado && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900"
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {gerarResultado}
        </div>
      )}

      <ResumoTiles resumo={data?.resumo} isLoading={isLoading} />

      <MensalidadeFilterBar value={filter} onChange={setFilter} />

      {isError && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{(error as Error).message}</span>
        </div>
      )}

      <MensalidadeTable
        mensalidades={data?.data ?? []}
        pagination={data?.pagination ?? { total: 0, page: 1, per_page: 20 }}
        onPageChange={(page) => setFilter({ ...filter, page })}
        isLoading={isLoading || isFetching}
      />
    </div>
  );
}
