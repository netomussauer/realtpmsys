import type { ReactNode } from "react";
import { AppSidebar } from "./_components/app-sidebar";
import { AppHeader } from "./_components/app-header";

/**
 * Layout das rotas protegidas (sistema de gestão).
 *
 * STATUS: estrutural — Fase 3 vai plugar a sessão real (cookie httpOnly via
 * BFF) e o middleware Next.js vai redirecionar não-autenticados pra /login.
 * Por ora, props hardcoded permitem desenvolver UI sem auth funcional.
 */
export default function AppLayout({ children }: { children: ReactNode }) {
  // TODO Fase 3: trocar por useSession() / cookies() do BFF.
  const fakeSession = {
    userEmail: "admin@realtpmsys.local",
    perfil: "ADMIN" as const,
  };

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <AppSidebar perfil={fakeSession.perfil} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AppHeader
          userEmail={fakeSession.userEmail}
          perfil={fakeSession.perfil}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
