"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertCircle, ShieldAlert } from "lucide-react";
import { TurmaForm } from "@/features/turmas/components/turma-form";
import { useTurma } from "@/features/turmas/hooks/use-turma";
import { useAtualizarTurma } from "@/features/turmas/hooks/use-mutations";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { TurmaFormData } from "@/features/turmas/schemas/turma.schema";

/**
 * /turmas/[id]/editar — edição de turma (dados + horários).
 *
 * Reusa o `TurmaForm` com `initial` populado pelo detail query. Somente
 * ADMIN pode editar (backend: PUT /turmas/{id} é ADMIN-only) — mostramos
 * mensagem de acesso negado se um TREINADOR acessar a URL direto.
 *
 * PUT substitui os horários por completo — não há PATCH parcial no
 * backend — por isso `initial.horarios` é sempre a lista atual completa.
 */
export default function EditarTurmaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const canManage = usePermission(["ADMIN"]);
  const [serverError, setServerError] = useState<string | null>(null);

  const turmaQuery = useTurma(id);
  const atualizar = useAtualizarTurma(id);

  if (!canManage) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-6 text-destructive">
        <ShieldAlert className="inline h-5 w-5 mr-2" />
        Você não tem permissão para editar turmas. Apenas administradores
        podem realizar esta ação.
      </div>
    );
  }

  if (turmaQuery.isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
      </div>
    );
  }

  if (turmaQuery.isError || !turmaQuery.data) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="inline h-4 w-4 mr-1" />
        Turma não encontrada.
      </div>
    );
  }

  const t = turmaQuery.data;
  // Adapta DTO -> FormData (form usa undefined em vez de null; horários
  // perdem o `id` — o backend recria os horários a cada PUT).
  const initial: Partial<TurmaFormData> = {
    nome: t.nome,
    faixa_etaria_min: t.faixa_etaria_min,
    faixa_etaria_max: t.faixa_etaria_max,
    capacidade_max: t.capacidade_max,
    treinador_id: t.treinador_id ?? undefined,
    campo_id: t.campo_id ?? undefined,
    horarios: t.horarios.map((h) => ({
      dia_semana: h.dia_semana,
      hora_inicio: h.hora_inicio,
      hora_fim: h.hora_fim,
    })),
  };

  const onSubmit = async (data: TurmaFormData) => {
    setServerError(null);
    try {
      await atualizar.mutateAsync(data);
      router.push(`/turmas/${id}`);
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={`/turmas/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para o detalhe
      </Link>

      <header>
        <h1 className="font-display text-3xl text-primary tracking-wide">
          Editar {t.nome}
        </h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados da turma. Os horários são substituídos por
          completo ao salvar.
        </p>
      </header>

      <div className="rounded-lg border border-border bg-card p-6">
        <TurmaForm
          initial={initial}
          submitLabel="Salvar alterações"
          serverError={serverError}
          isSubmitting={atualizar.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push(`/turmas/${id}`)}
        />
      </div>
    </div>
  );
}
