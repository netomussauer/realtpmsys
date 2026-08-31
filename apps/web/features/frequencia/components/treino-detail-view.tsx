"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, AlertCircle, Clock, CheckCircle2 } from "lucide-react";
import { formatDateBR } from "@/shared/lib/format";
import { useTreinos } from "@/features/frequencia/hooks/use-treinos";
import { useFrequencias } from "@/features/frequencia/hooks/use-frequencias";
import { useLancarFrequencias } from "@/features/frequencia/hooks/use-mutations";
import { useTurma } from "@/features/turmas/hooks/use-turma";
import { useMatriculas } from "@/features/turmas/hooks/use-matriculas";
import { FrequenciaForm } from "@/features/frequencia/components/frequencia-form";
import { PresencaBadge } from "@/features/frequencia/components/presenca-badge";
import type { Presenca } from "@/features/frequencia/types/frequencia.types";
import type { FrequenciaLoteFormData } from "@/features/frequencia/schemas/frequencia.schema";

interface TreinoDetailViewProps {
  treinoId: string;
}

/**
 * Conteúdo client de /treinos/[id] — detalhe do treino + checklist de
 * lançamento de frequência.
 *
 * **Não existe `GET /treinos/{id}`** no backend (só criação e listagem por
 * turma). Por isso esta página exige `?turma_id=` na query string (vindo
 * do link em treino-table.tsx) e usa `GET /turmas/{turma_id}/treinos`
 * (via `useTreinos`) para localizar o treino certo client-side, buscando
 * com `per_page: 500` pra maximizar a chance de achar o registro numa
 * única página (limitação conhecida: turmas com mais de 500 treinos no
 * histórico — anos de sessões semanais — podem não ter o treino
 * localizado; fora de escopo resolver isso sem um `GET /treinos/{id}`
 * real no backend).
 *
 * `matriculasQuery`/`frequenciasQuery` só disparam depois que `treino` é
 * confirmado (turmaId/treinoId passam a `undefined` até lá, e os hooks já
 * tratam `enabled: !!id` internamente) — evita 2 requests desperdiçadas
 * quando o link é inválido ou o treino não existe nessa turma.
 *
 * Se a página for acessada sem `turma_id` ou o treino não for encontrado
 * na lista daquela turma, mostra estado de "não encontrado" com link de
 * volta pra /treinos — não tenta adivinhar.
 */
export function TreinoDetailView({ treinoId }: TreinoDetailViewProps) {
  const searchParams = useSearchParams();
  const turmaId = searchParams.get("turma_id") ?? undefined;

  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const turmaQuery = useTurma(turmaId);
  const treinosQuery = useTreinos(turmaId, { per_page: 500 });
  const treino = treinosQuery.data?.data.find((t) => t.id === treinoId);

  const matriculasQuery = useMatriculas(treino ? turmaId : undefined, {
    status: "ATIVA",
    per_page: 500,
  });
  const frequenciasQuery = useFrequencias(treino ? treinoId : undefined);
  const lancar = useLancarFrequencias(treinoId);

  if (!turmaId) {
    return <TreinoNaoEncontrado motivo="Link inválido — falta identificar a turma do treino." />;
  }

  if (treinosQuery.isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
      </div>
    );
  }

  if (treinosQuery.isError) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="inline h-4 w-4 mr-1" />
        Erro ao carregar os treinos da turma.
        <p className="mt-1 text-xs">{(treinosQuery.error as Error).message}</p>
      </div>
    );
  }

  if (!treino) {
    return <TreinoNaoEncontrado motivo="Treino não encontrado para esta turma." />;
  }

  const onSubmitFrequencias = async (data: FrequenciaLoteFormData) => {
    setServerError(null);
    setSuccessMessage(null);
    try {
      await lancar.mutateAsync(data);
      setSuccessMessage("Frequência registrada com sucesso.");
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  const carregandoChecklist = matriculasQuery.isLoading || frequenciasQuery.isLoading;
  const resumoPresenca = contarPorPresenca(frequenciasQuery.data?.data ?? []);
  const matriculasTruncated =
    !!matriculasQuery.data && matriculasQuery.data.pagination.total > matriculasQuery.data.data.length;
  // Erro real de fetch não deve renderizar o checklist como "sem atletas" —
  // essa mensagem do FrequenciaForm é só pra quando de fato não há
  // matrícula ativa, não para "não consegui carregar" (achado de code-review).
  const checklistIndisponivel = matriculasQuery.isError || frequenciasQuery.isError;

  return (
    <div className="space-y-6">
      <Link
        href="/treinos"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para a lista
      </Link>

      <div className="space-y-1">
        <h1 className="font-display text-3xl text-primary tracking-wide">
          Treino de {formatDateBR(treino.data_treino)}
        </h1>
        <p className="text-sm text-muted-foreground">
          {turmaQuery.data ? turmaQuery.data.nome : "Carregando turma..."}
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-accent shrink-0" />
            <span>
              {treino.hora_inicio && treino.hora_fim
                ? `${treino.hora_inicio}–${treino.hora_fim}`
                : "Horário não informado"}
            </span>
          </div>
        </div>
        {treino.observacao && (
          <p className="mt-3 text-sm text-muted-foreground">{treino.observacao}</p>
        )}
      </section>

      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-xl text-primary tracking-wide">Frequência</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Marque a presença de cada atleta matriculado na turma. Justificativa é
          obrigatória quando a presença é &quot;Justificado&quot;.
        </p>

        {successMessage && (
          <div role="status" className="mt-4 flex items-center gap-2 rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-900">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            {successMessage}
          </div>
        )}

        {matriculasQuery.isError && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Erro ao carregar matrículas da turma: {(matriculasQuery.error as Error).message}</span>
          </div>
        )}

        {frequenciasQuery.isError && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Erro ao carregar frequências já lançadas: {(frequenciasQuery.error as Error).message}</span>
          </div>
        )}

        {matriculasTruncated && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>
              Esta turma tem {matriculasQuery.data?.pagination.total} matrículas ativas, mas
              só as primeiras {matriculasQuery.data?.data.length} aparecem no checklist abaixo —
              atletas fora dessa lista não terão frequência lançada.
            </span>
          </div>
        )}

        {!carregandoChecklist && (frequenciasQuery.data?.data.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Já lançado:</span>
            {resumoPresenca.map(({ presenca, total }) => (
              <span key={presenca} className="inline-flex items-center gap-1">
                <PresencaBadge presenca={presenca} />
                <span className="text-muted-foreground">×{total}</span>
              </span>
            ))}
          </div>
        )}

        <div className="mt-4">
          {carregandoChecklist ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-10 rounded bg-muted" />
              <div className="h-10 rounded bg-muted" />
              <div className="h-10 rounded bg-muted" />
            </div>
          ) : !checklistIndisponivel ? (
            <FrequenciaForm
              matriculas={matriculasQuery.data?.data ?? []}
              existentes={frequenciasQuery.data?.data ?? []}
              serverError={serverError}
              isSubmitting={lancar.isPending}
              onSubmit={onSubmitFrequencias}
            />
          ) : null}
        </div>
      </section>
    </div>
  );
}

function TreinoNaoEncontrado({ motivo }: { motivo: string }) {
  return (
    <div className="space-y-4">
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="inline h-4 w-4 mr-1" />
        {motivo}
      </div>
      <Link
        href="/treinos"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para a lista de treinos
      </Link>
    </div>
  );
}

/** Conta quantos registros existem por tipo de presença — usado no resumo acima do checklist. */
function contarPorPresenca(
  frequencias: ReadonlyArray<{ presenca: Presenca }>,
): Array<{ presenca: Presenca; total: number }> {
  const ordem: Presenca[] = ["PRESENTE", "AUSENTE", "JUSTIFICADO"];
  return ordem
    .map((presenca) => ({
      presenca,
      total: frequencias.filter((f) => f.presenca === presenca).length,
    }))
    .filter((r) => r.total > 0);
}
