"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

/**
 * Providers — wrapper de todos os providers de contexto da aplicação.
 *
 * Por que useState pra criar o QueryClient: garante 1 instância por
 * render-tree no servidor (evita compartilhar cache entre requests
 * concorrentes durante SSR), e mesma instância em re-renders do client.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Dados de servidor mudam relativamente devagar (atletas, turmas).
            // 30s evita refetch agressivo sem deixar a UI ficar desatualizada.
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
          mutations: {
            retry: 0,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
