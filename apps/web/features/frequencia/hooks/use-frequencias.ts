"use client";

import { useQuery } from "@tanstack/react-query";
import { frequenciaService } from "@/features/frequencia/services/frequencia.service";

/**
 * useFrequencias — lista (flat, sem paginação) das frequências já
 * lançadas para um treino. Vazio quando nenhum lançamento foi feito ainda
 * — nesse caso o formulário de lançamento inicia com todos os atletas
 * como "Presente" (vide frequencia-form.tsx).
 */
export function useFrequencias(treinoId: string | undefined) {
  return useQuery({
    queryKey: ["frequencias", "list", treinoId],
    queryFn: () => frequenciaService.listFrequencias(treinoId!),
    enabled: !!treinoId,
  });
}
