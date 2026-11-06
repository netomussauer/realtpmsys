"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { contaService } from "@/features/contas/services/conta.service";
import type { ContaFilter } from "@/features/contas/types/conta.types";

/**
 * useContas — lista paginada de contas com filtros (busca, perfil, status).
 *
 * `placeholderData: keepPreviousData` segura a página antiga enquanto a nova
 * carrega — evita a tabela piscar vazia ao trocar de página/filtro.
 */
export function useContas(filter: ContaFilter = {}) {
  return useQuery({
    queryKey: ["contas", "list", filter],
    queryFn: () => contaService.list(filter),
    placeholderData: keepPreviousData,
  });
}
