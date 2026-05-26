"use client";

import { useState } from "react";
import { LogOut, User } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { authService } from "@/features/auth/services/auth.service";

interface AppHeaderProps {
  /** Vem de (app)/layout.tsx (server-side via getVerifiedSession). */
  userEmail: string;
  perfil: "ADMIN" | "TREINADOR" | "RESPONSAVEL";
}

/**
 * AppHeader — barra superior dentro da área protegida.
 *
 * Logout chama POST /api/auth/logout (BFF limpa cookies httpOnly) e
 * faz hard-navigate pra Home — assim qualquer cache TanStack/Next em
 * memória é descartado, sem chance de UI "lembrar" dados do user antigo.
 */
export function AppHeader({ userEmail, perfil }: AppHeaderProps) {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await authService.logout();
    } finally {
      window.location.href = "/";
    }
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
          disabled={loggingOut}
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Saindo..." : "Sair"}
        </Button>
      </div>
    </header>
  );
}
