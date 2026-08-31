"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { frequenciaService } from "@/features/frequencia/services/frequencia.service";
import type { TreinoFilter } from "@/features/frequencia/types/frequencia.types";

/**
 * useTreinos — lista paginada de treinos de uma turma, com filtro de
 * período (data_inicio/data_fim).
 *
 * `enabled: !!turmaId` evita disparar a query enquanto a turma não estiver
 * selecionada (mesmo padrão de useMatriculas). `placeholderData:
 * keepPreviousData` segura a página antiga enquanto a nova carrega — evita
 * o "blink" da tabela ficar vazia ao trocar de página/filtro.
 */
export function useTreinos(turmaId: string | undefined, filter: TreinoFilter = {}) {
  return useQuery({
    queryKey: ["treinos", "list", turmaId, filter],
    queryFn: () => frequenciaService.listTreinos(turmaId!, filter),
    enabled: !!turmaId,
    placeholderData: keepPreviousData,
  });
}
