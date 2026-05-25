"use client";

import { LogOut, User } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface AppHeaderProps {
  /** Em Fase 3 vem do hook useSession (cookie httpOnly via BFF). */
  userEmail: string;
  perfil: "ADMIN" | "TREINADOR" | "RESPONSAVEL";
}

/**
 * AppHeader — barra superior dentro da área protegida.
 *
 * Mostra usuário + perfil + botão de logout. O logout chama o BFF route
 * handler `/api/auth/logout` (Fase 3) que limpa os cookies e redireciona.
 */
export function AppHeader({ userEmail, perfil }: AppHeaderProps) {
  const handleLogout = async () => {
    // TODO Fase 3: chamar /api/auth/logout (BFF) e redirecionar.
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-border bg-background">
      <div className="flex h-full items-center justify-end gap-4 px-4">
        <div className="flex items-center gap-2 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-foreground font-medium">{userEmail}</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
            {perfil}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}
