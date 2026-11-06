import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppSidebar } from "./_components/app-sidebar";
import { AppHeader } from "./_components/app-header";
import { getRefreshToken, getSession, getVerifiedSession } from "@/shared/lib/session";

/**
 * Layout das rotas protegidas (sistema de gestão).
 *
 * Server Component — lê a sessão dos cookies httpOnly via
 * `getVerifiedSession()` (valida JWT com jose). Defesa em profundidade junto
 * com o middleware Next; a autorização real de cada dado é do backend Go.
 *
 * O access token vive 15 min e o cookie dele some ao expirar, mas a sessão
 * continua válida enquanto o refresh token existir. Um Server Component não
 * pode regravar cookies, então não dá para renovar aqui; exigir um access
 * vivo mandaria o usuário para /login a cada 15 min — e o middleware o
 * devolveria para /dashboard (há cookie de sessão), formando um loop. Por
 * isso, sem access válido mas COM refresh, renderizamos com os metadados do
 * cookie de sessão (usados só para a UI: menu e cabeçalho) e deixamos a
 * renovação para a primeira chamada de API / `useSession()`, que podem gravar
 * cookies. Sem refresh → /login.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  let session = await getVerifiedSession();
  if (!session) {
    const refresh = await getRefreshToken();
    const meta = refresh ? await getSession() : null;
    if (!meta) {
      redirect("/login");
    }
    session = meta;
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
