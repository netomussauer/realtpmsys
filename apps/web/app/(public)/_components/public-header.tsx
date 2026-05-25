"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { siteConfig } from "@/shared/lib/config";
import { Button } from "@/shared/components/ui/button";
import { Logo } from "@/shared/components/logo";

/**
 * PublicHeader — barra de navegação do site institucional.
 *
 * Layout: logo à esquerda · menu central (oculto em mobile) · botão "Acessar
 * sistema" à direita (dourado, discreto). Em mobile, hamburger abre overlay.
 *
 * Marca a rota ativa via aria-current para acessibilidade + estilo (NavLink).
 */
export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        {/* Menu desktop */}
        <nav className="hidden md:flex items-center gap-6" aria-label="Navegação principal">
          {siteConfig.menuPublico.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Login + hamburger */}
        <div className="flex items-center gap-2">
          <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Acessar sistema
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((s) => !s)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Drawer mobile — slide-down simples sem dependência extra */}
      {mobileOpen && (
        <nav
          className="md:hidden border-t border-border bg-background"
          aria-label="Navegação mobile"
        >
          <ul className="container py-2">
            {siteConfig.menuPublico.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex py-3 text-sm font-medium",
                    isActive(item.href)
                      ? "text-primary"
                      : "text-muted-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Button asChild variant="accent" className="w-full">
                <Link href="/login" onClick={() => setMobileOpen(false)}>
                  <LogIn className="h-4 w-4" />
                  Acessar sistema
                </Link>
              </Button>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
