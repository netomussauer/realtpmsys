import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/shared/components/logo";

/**
 * Layout das rotas de autenticação — sem header/footer institucional.
 *
 * Centraliza o conteúdo (card de login) num gradient da identidade da
 * Academia. Link de volta para a Home no canto superior — usuário não fica
 * preso na tela de login.
 */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary via-primary to-primary/80">
      <div className="container py-6">
        <Link
          href="/"
          className="inline-flex items-center text-primary-foreground/80 hover:text-accent transition-colors text-sm"
        >
          ← Voltar para o site
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center">
            <Logo variant="inverse" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
