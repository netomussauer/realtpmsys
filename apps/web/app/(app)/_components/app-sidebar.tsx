"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Wallet,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Logo } from "@/shared/components/logo";

/**
 * Itens do menu lateral. O `perfis` filtra visibilidade — a checagem dura é
 * no middleware Next.js + RequirePerfil do backend. Aqui é só ergonomia.
 */
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  perfis: ReadonlyArray<"ADMIN" | "TREINADOR" | "RESPONSAVEL">;
};

const navItems: ReadonlyArray<NavItem> = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    perfis: ["ADMIN", "TREINADOR", "RESPONSAVEL"],
  },
  {
    href: "/atletas",
    label: "Atletas",
    icon: Users,
    perfis: ["ADMIN", "TREINADOR", "RESPONSAVEL"],
  },
  {
    href: "/turmas",
    label: "Turmas",
    icon: ClipboardList,
    perfis: ["ADMIN", "TREINADOR"],
  },
  {
    href: "/treinos",
    label: "Treinos",
    icon: Calendar,
    perfis: ["ADMIN", "TREINADOR"],
  },
  {
    href: "/mensalidades",
    label: "Mensalidades",
    icon: Wallet,
    perfis: ["ADMIN", "RESPONSAVEL"],
  },
  {
    href: "/relatorios",
    label: "Relatórios",
    icon: BarChart3,
    perfis: ["ADMIN", "TREINADOR"],
  },
];

interface AppSidebarProps {
  /** Perfil do usuário autenticado. Em Fase 3, virá do hook useSession. */
  perfil: "ADMIN" | "TREINADOR" | "RESPONSAVEL";
}

export function AppSidebar({ perfil }: AppSidebarProps) {
  const pathname = usePathname();
  const visible = navItems.filter((item) => item.perfis.includes(perfil));

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center border-b border-border px-4">
        <Logo compact />
      </div>
      <nav className="flex-1 p-3 space-y-1" aria-label="Navegação do sistema">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Perfil: {perfil}</p>
        <p className="opacity-70">Sessão ativa</p>
      </div>
    </aside>
  );
}
