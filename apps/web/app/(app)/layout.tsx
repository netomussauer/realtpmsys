import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppSidebar } from "./_components/app-sidebar";
import { AppHeader } from "./_components/app-header";
import { getVerifiedSession } from "@/shared/lib/session";

/**
 * Layout das rotas protegidas (sistema de gestão).
 *
 * Server Component — lê a sessão dos cookies httpOnly via
 * `getVerifiedSession()` (valida JWT com jose). Sem sessão válida →
 * redirect 307 pra /login. Isso é defesa-em-profundidade junto com o
 * middleware Next: caso o middleware seja contornado, o layout
 * server-side ainda barra a renderização e o backend Go nunca recebe
 * request com cookie inválido.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getVerifiedSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <AppSidebar perfil={session.perfil} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader userEmail={session.email} perfil={session.perfil} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
