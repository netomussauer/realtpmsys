import type { ReactNode } from "react";
import { PublicHeader } from "./_components/public-header";
import { PublicFooter } from "./_components/public-footer";

/**
 * Layout das rotas públicas — aplica header + footer institucional.
 *
 * Route Group `(public)` não cria URL prefix: `/sobre` resolve para
 * `app/(public)/sobre/page.tsx`. Tudo aqui é SSG por padrão (Next 15 com
 * App Router gera estático qualquer página sem `cookies()`/`headers()`).
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
