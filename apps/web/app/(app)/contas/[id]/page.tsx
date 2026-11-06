"use client";

import Link from "next/link";
import { use, useState } from "react";
import { AlertCircle, ChevronLeft, ShieldAlert } from "lucide-react";
import { ContaAcoes } from "@/features/contas/components/conta-acoes";
import { ContaForm } from "@/features/contas/components/conta-form";
import {
  PerfilBadge,
  SenhaTemporariaBadge,
  StatusContaBadge,
} from "@/features/contas/components/conta-badges";
import { useConta } from "@/features/contas/hooks/use-conta";
import { useAtualizarConta } from "@/features/contas/hooks/use-mutations";
import { useSession } from "@/features/auth/hooks/use-session";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { EditarContaFormData } from "@/features/contas/schemas/conta.schema";

/**
 * /contas/[id] — detalhe da conta: editar nome/perfil, ativar/desativar e
 * redefinir senha. Next 15: `params` é Promise — resolvido com `use()`.
 */
export default function ContaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const isAdmin = usePermission(["ADMIN"]);
  const { session } = useSession();
  const contaQuery = useConta(isAdmin ? id : undefined);
  const atualizar = useAtualizarConta(id);
  const [serverError, setServerError] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);

  if (!isAdmin) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-6 text-destructive">
        <ShieldAlert className="mr-2 inline h-5 w-5" />
        Apenas administradores podem gerenciar contas.
      </div>
    );
  }

  if (contaQuery.isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded bg-muted" />
        <div className="h-32 rounded bg-muted" />
      </div>
    );
  }

  if (contaQuery.isError || !contaQuery.data) {
    return (
      <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive">
        <AlertCircle className="mr-1 inline h-4 w-4" />
        Conta não encontrada ou erro ao carregar.
        {contaQuery.error && <p className="mt-1 text-xs">{(contaQuery.error as Error).message}</p>}
      </div>
    );
  }

  const conta = contaQuery.data;
  const ehContaPropria = session?.userId === conta.id;

  const onSubmit = async (data: EditarContaFormData) => {
    setServerError(null);
    setSalvo(false);
    try {
      await atualizar.mutateAsync(data);
      setSalvo(true);
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

      <header className="space-y-2">
        <h1 className="font-display text-3xl text-primary tracking-wide">{conta.nome || conta.email}</h1>
        {conta.nome && <p className="text-sm text-muted-foreground">{conta.email}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <PerfilBadge perfil={conta.perfil} />
          <StatusContaBadge ativo={conta.ativo} />
          {conta.deve_trocar_senha && <SenhaTemporariaBadge />}
        </div>
      </header>

      <section className="space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-xl text-primary">Acesso</h2>
        <ContaAcoes conta={conta} ehContaPropria={ehContaPropria} />
      </section>

      <section className="space-y-3 rounded-lg border border-border bg-card p-6">
        <h2 className="font-display text-xl text-primary">Dados da conta</h2>
        {salvo && (
          <div role="status" className="rounded-md border border-accent/40 bg-accent/10 p-3 text-sm">
            Alterações salvas.
          </div>
        )}
        <ContaForm
          mode="editar"
          email={conta.email}
          initial={{ nome: conta.nome, perfil: conta.perfil }}
          perfilBloqueado={ehContaPropria}
          serverError={serverError}
          isSubmitting={atualizar.isPending}
          onSubmit={onSubmit}
        />
      </section>
    </div>
  );
}
