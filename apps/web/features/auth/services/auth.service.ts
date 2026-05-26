/**
 * Cliente HTTP do contexto auth — chama os BFF route handlers do próprio
 * Next.js (NÃO o backend Go diretamente). Cookies httpOnly são enviados
 * automaticamente pelo browser (mesma origem).
 *
 * O backend Go nunca é tocado a partir do client — tudo passa pelos
 * /api/auth/* (login, refresh, logout, session) ou pelos proxies de
 * domínio (/api/v1/* na Fase 4).
 */

import type { LoginFormData } from "@/features/auth/schemas/login.schema";
import type { Perfil, Session } from "@/features/auth/types/auth.types";

export interface LoginResult {
  userId: string;
  perfil: Perfil;
}

export const authService = {
  async login(data: LoginFormData): Promise<LoginResult> {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      credentials: "same-origin",
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string } & LoginResult;
    if (!res.ok) {
      throw new Error(json.error ?? `Falha ao autenticar (HTTP ${res.status})`);
    }
    return { userId: json.userId, perfil: json.perfil };
  },

  async logout(): Promise<void> {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });
  },

  async session(): Promise<Session | null> {
    const res = await fetch("/api/auth/session", { credentials: "same-origin" });
    if (res.status === 401) return null;
    const json = (await res.json()) as { session: Session | null };
    return json.session;
  },

  async refresh(): Promise<boolean> {
    const res = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "same-origin",
    });
    return res.ok;
  },
};
