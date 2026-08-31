"use client";

import { useQuery } from "@tanstack/react-query";
import { financeiroService } from "@/features/financeiro/services/financeiro.service";

/**
 * usePlanosAtivos — picker auxiliar read-only, usado só para popular o
 * `<select>` de plano do formulário de contrato (features/financeiro não
 * tem uma feature de Planos completa — sem CRUD, sem página própria no
 * nav — mesmo padrão pragmático de useTreinadoresAtivos/useCamposAtivos
 * em features/turmas/hooks/use-picker-data.ts).
 *
 * staleTime alto (5 min): planos raramente mudam durante uma sessão de
 * uso. Filtra `ativo` client-side por segurança mesmo a API já devolvendo
 * só planos ativos (conforme comentário do pedido original).
 */
export function usePlanosAtivos() {
  const query = useQuery({
    queryKey: ["financeiro", "picker", "planos"],
    queryFn: () => financeiroService.listPlanosAtivos(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    data: query.data?.data.filter((p) => p.ativo),
  };
}
