"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, AlertCircle } from "lucide-react";
import { AtletaForm } from "@/features/atletas/components/atleta-form";
import { useAtleta } from "@/features/atletas/hooks/use-atleta";
import { useAtualizarAtleta } from "@/features/atletas/hooks/use-mutations";
import type { AtletaFormData } from "@/features/atletas/schemas/atleta.schema";

/**
 * /atletas/[id]/editar — edição dos dados pessoais do atleta.
 *
 * Reusa o `AtletaForm` (Step 1 do wizard) com `initial` populado pelo
 * detail query. Responsáveis e uniforme têm telas próprias (futura
 * Fase 4.5) — esta página foca apenas no agregado raiz.
 */
export default function EditarAtletaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const atletaQuery = useAtleta(id);
  const atualizar = useAtualizarAtleta(id);

  if (atletaQuery.isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-64 rounded bg-muted" />
      </div>
    );
  }

  if (atletaQuery.isError || !atletaQuery.data) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="inline h-4 w-4 mr-1" />
        Atleta não encontrado.
      </div>
    );
  }

  const a = atletaQuery.data;
  // Adapta DTO -> FormData (form usa undefined em vez de null).
  const initial: Partial<AtletaFormData> = {
    nome: a.nome,
    data_nascimento: a.data_nascimento,
    cpf: a.cpf ?? undefined,
    rg: a.rg ?? undefined,
    endereco: a.endereco ?? undefined,
    cidade: a.cidade ?? undefined,
    uf: a.uf ?? undefined,
    cep: a.cep ?? undefined,
    email: a.email ?? undefined,
    telefone: a.telefone ?? undefined,
  };

  const onSubmit = async (data: AtletaFormData) => {
    setServerError(null);
    try {
      await atualizar.mutateAsync(data);
      router.push(`/atletas/${id}`);
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Link
        href={`/atletas/${id}`}
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para o detalhe
      </Link>

      <header>
        <h1 className="font-display text-3xl text-primary tracking-wide">
          Editar {a.nome}
        </h1>
        <p className="text-sm text-muted-foreground">
          Atualize os dados pessoais. Responsáveis e uniforme são editados em
          telas próprias (em breve).
        </p>
      </header>

      <div className="rounded-lg border border-border bg-card p-6">
        <AtletaForm
          initial={initial}
          submitLabel="Salvar alterações"
          serverError={serverError}
          isSubmitting={atualizar.isPending}
          onSubmit={onSubmit}
          onCancel={() => router.push(`/atletas/${id}`)}
        />
      </div>
    </div>
  );
}
