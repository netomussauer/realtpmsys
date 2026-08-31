"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { frequenciaService } from "@/features/frequencia/services/frequencia.service";
import type {
  TreinoDTO,
  LancarFrequenciasResponse,
} from "@/features/frequencia/types/frequencia.types";
import type { TreinoFormData } from "@/features/frequencia/schemas/treino.schema";
import type { FrequenciaLoteFormData } from "@/features/frequencia/schemas/frequencia.schema";

/**
 * Mutations da feature frequência — concentradas num único arquivo (mesmo
 * padrão de features/turmas/hooks/use-mutations.ts).
 */

export function useCriarTreino(turmaId: string) {
  const qc = useQueryClient();
  return useMutation<TreinoDTO, Error, TreinoFormData>({
    mutationFn: (data) => frequenciaService.criarTreino(turmaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["treinos", "list", turmaId] });
    },
  });
}

/**
 * A resposta de POST /treinos/{id}/frequencias é só um resumo (vide
 * types), não a lista atualizada — por isso invalidamos a query de
 * listagem em vez de usar `setQueryData` com o resultado da mutation.
 */
export function useLancarFrequencias(treinoId: string) {
  const qc = useQueryClient();
  return useMutation<LancarFrequenciasResponse, Error, FrequenciaLoteFormData>({
    mutationFn: (data) => frequenciaService.lancarFrequencias(treinoId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["frequencias", "list", treinoId] });
    },
  });
}
