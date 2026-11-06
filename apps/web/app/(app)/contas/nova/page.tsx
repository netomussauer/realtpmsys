"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShieldAlert } from "lucide-react";
import { ContaForm } from "@/features/contas/components/conta-form";
import { SenhaTemporariaBox } from "@/features/contas/components/senha-temporaria-box";
import { useCriarConta } from "@/features/contas/hooks/use-mutations";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { CriarContaFormData } from "@/features/contas/schemas/conta.schema";

/**
 * /contas/nova — cria a conta e mostra a senha temporária uma única vez.
 *
 * A senha fica só em estado local (`criada`): ao clicar em "Concluir" ou
 * sair da página ela se perde. Não vai para a URL, cache nem storage.
 */
export default function NovaContaPage() {
  const router = useRouter();
  const isAdmin = usePermission(["ADMIN"]);
  const criar = useCriarConta();
  const [serverError, setServerError] = useState<string | null>(null);
  const [criada, setCriada] = useState<{ id: string; email: string; senha: string } | null>(null);

  if (!isAdmin) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-6 text-destructive">
        <ShieldAlert className="mr-2 inline h-5 w-5" />
        Apenas administradores podem criar contas.
      </div>
    );
  }

  const onSubmit = async (data: CriarContaFormData) => {
    setServerError(null);
    try {
      const r = await criar.mutateAsync(data);
      setCriada({ id: r.id, email: r.email, senha: r.senha_temporaria });
    } catch (e) {
      setServerError((e as Error).message);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/contas"
        className="inline-flex items-center text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para a lista
      </Link>

      <header>
        <h1 className="font-display text-3xl text-primary tracking-wide">Nova conta</h1>
        <p className="text-sm text-muted-foreground">
          Crie o acesso de uma pessoa. A senha inicial é gerada pelo sistema.
        </p>
      </header>

      {criada ? (
        <SenhaTemporariaBox
          titulo="Conta criada"
          email={criada.email}
          senha={criada.senha}
          concluirLabel="Ir para a conta"
          onConcluir={() => router.push(`/contas/${criada.id}`)}
        />
      ) : (
        <div className="rounded-lg border border-border bg-card p-6">
          <ContaForm
            mode="criar"
            serverError={serverError}
            isSubmitting={criar.isPending}
            onSubmit={onSubmit}
            onCancel={() => router.push("/contas")}
          />
        </div>
      )}
    </div>
  );
}
