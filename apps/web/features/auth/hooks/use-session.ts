"use client";

import { useQuery } from "@tanstack/react-query";
import { authService } from "@/features/auth/services/auth.service";
import type { Session } from "@/features/auth/types/auth.types";

/**
 * useSession — devolve a sessão autenticada atual (ou null).
 *
 * Faz fetch para `/api/auth/session` (BFF) via TanStack Query. Cache de
 * 30s — não vale interrogar o servidor a cada render. `refetchOnWindowFocus`
 * vem do default global do QueryClient (false em providers.tsx); usuário
 * que retorna à aba não dispara fetch desnecessário.
 *
 * Note: este hook é client-side. Para layouts/route handlers server-side,
 * use `getSession()` ou `getVerifiedSession()` de @/shared/lib/session.
 */
export function useSession() {
  const query = useQuery<Session | null>({
    queryKey: ["auth", "session"],
    queryFn: () => authService.session(),
    staleTime: 30_000,
    retry: false,
  });

  return {
    session: query.data ?? null,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    refetch: query.refetch,
  };
}
