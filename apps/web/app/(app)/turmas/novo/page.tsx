"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { TurmaForm } from "@/features/turmas/components/turma-form";
import { useCriarTurma } from "@/features/turmas/hooks/use-mutations";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { TurmaFormData } from "@/features/turmas/schemas/turma.schema";

/**
 * /turmas/novo — formulário de criação de turma.
 *
 * Somente ADMIN pode criar turmas (backend: POST /turmas é ADMIN-only via
 * RequirePerfil). O middleware não distingue ADMIN de TREINADOR nesta
 * rota — ambos passam pelo `/turmas` prefix — então a checagem fina é
 * feita aqui com `usePermission`. Se um TREINADOR acessar a URL direto,
 * mostramos uma mensagem de acesso negado em vez de renderizar o form.
 */
export default function NovaTurmaPage() {
  const router = useRouter();
  const canManage = usePermission(["ADMIN"]);
  const [serverError, setServerError] = useState<string | null>(null);
  const criar = useCriarTurma();

  if (!canManage) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-6 text-destructive">
        <ShieldAlert className="inline h-5 w-5 mr-2" />
        Você não tem permissão para criar turmas. Apenas administradores podem
        realizar esta ação.
      </div>
    );
  }

  const onSubmit = async (data: TurmaFormData) => {
    setServerError(null);
    try {
      const created = await criar.mutateAsync(data);
      router.push(`/turmas/${created.id}`);
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href="/turmas"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para a lista
      </Link>

      <header>
        <h1 className="font-display text-3xl text-primary tracking-wide">
          Nova turma
        </h1>
        <p className="text-sm text-muted-foreground">
          Defina os dados da turma e, opcionalmente, seus horários semanais.
          Matrículas são feitas depois, pela página de detalhe.
        </p>
      </header>

      <div className="rounded-lg border border-border bg-card p-6">
        <TurmaForm
          submitLabel="Criar turma"
          serverError={serverError}
          isSubmitting={criar.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push("/turmas")}
        />
      </div>
    </div>
  );
}
