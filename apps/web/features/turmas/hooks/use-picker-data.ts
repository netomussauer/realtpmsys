"use client";

import { useQuery } from "@tanstack/react-query";
import { listTreinadores, listCampos } from "@/features/turmas/services/turma.service";

/**
 * Pickers auxiliares (treinador, campo) — read-only, usados para popular
 * selects do formulário de turma.
 *
 * staleTime alto (5 min): são dados que raramente mudam durante uma sessão
 * de uso, evita refetch desnecessário a cada abertura do formulário.
 *
 * Os endpoints `/treinadores` e `/campos` não aceitam filtro de
 * status/ativo — filtramos client-side (per_page alto cobre o volume
 * esperado; paginação server-side fica fora de escopo aqui).
 */
export function useTreinadoresAtivos() {
  const query = useQuery({
    queryKey: ["turmas", "picker", "treinadores"],
    queryFn: () => listTreinadores({ per_page: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    data: query.data?.data.filter((t) => t.status === "ATIVO"),
  };
}

export function useCamposAtivos() {
  const query = useQuery({
    queryKey: ["turmas", "picker", "campos"],
    queryFn: () => listCampos({ per_page: 100 }),
    staleTime: 5 * 60 * 1000,
  });

  return {
    ...query,
    data: query.data?.data.filter((c) => c.ativo),
  };
}
