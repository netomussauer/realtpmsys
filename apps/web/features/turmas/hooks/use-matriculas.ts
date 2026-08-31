"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { turmaService } from "@/features/turmas/services/turma.service";
import type { MatriculaFilter } from "@/features/turmas/types/turma.types";

/**
 * useMatriculas — lista paginada de matrículas de uma turma.
 *
 * Também usado com `{ status: "ATIVA", per_page: 1 }` só para ler
 * `pagination.total` e calcular vagas disponíveis na página de detalhe
 * (o backend não expõe `vagas_disponiveis` neste contexto).
 */
export function useMatriculas(
  turmaId: string | undefined,
  filter: MatriculaFilter = {},
) {
  return useQuery({
    queryKey: ["turmas", "matriculas", turmaId, filter],
    queryFn: () => turmaService.listMatriculas(turmaId!, filter),
    enabled: !!turmaId,
    placeholderData: keepPreviousData,
  });
}
