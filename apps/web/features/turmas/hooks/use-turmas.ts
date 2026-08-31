"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { turmaService } from "@/features/turmas/services/turma.service";
import type { TurmaFilter } from "@/features/turmas/types/turma.types";

/**
 * useTurmas — lista paginada de turmas com filtros (status, treinador).
 *
 * `placeholderData: keepPreviousData` segura a página antiga enquanto a
 * nova carrega — evita o "blink" da tabela ficar vazia ao trocar de
 * página/filtro. Stale 30s do default global (providers.tsx).
 */
export function useTurmas(filter: TurmaFilter = {}) {
  return useQuery({
    queryKey: ["turmas", "list", filter],
    queryFn: () => turmaService.list(filter),
    placeholderData: keepPreviousData,
  });
}
