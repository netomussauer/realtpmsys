"use client";

import { ShieldAlert } from "lucide-react";
import { TrocarSenhaForm } from "@/features/contas/components/trocar-senha-form";
import { PerfilBadge } from "@/features/contas/components/conta-badges";
import { useSession } from "@/features/auth/hooks/use-session";

/**
 * /minha-conta — dados da própria conta e troca de senha (todos os perfis).
 *
 * Com senha temporária (`session.deveTrocarSenha`) esta é a única tela do
 * sistema acessível: o middleware Next redireciona para cá e o backend
 * responde 403 PASSWORD_CHANGE_REQUIRED nas demais rotas.
 */
export default function MinhaContaPage() {
  const { session } = useSession();
  const obrigatoria = session?.deveTrocarSenha === true;

  return (
    <div className="max-w-xl space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl text-primary tracking-wide">Minha conta</h1>
        {session && (
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{session.email}</span>
            <PerfilBadge perfil={session.perfil} />
          </div>
        )}
      </header>

      {obrigatoria && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900"
        >
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Você está usando uma <strong>senha temporária</strong>. Escolha uma senha própria para
            continuar usando o sistema.
          </span>
        </div>
      )}

      <TrocarSenhaForm obrigatoria={obrigatoria} />
    </div>
  );
}
