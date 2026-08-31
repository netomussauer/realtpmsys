"use client";

import { useQuery } from "@tanstack/react-query";
import { relatorioService } from "@/features/relatorios/services/relatorio.service";
import { isPeriodoValido } from "@/features/relatorios/schemas/periodo.schema";
import type { PeriodoFilter } from "@/features/relatorios/types/relatorio.types";

/**
 * useFrequenciaAtleta — GET /relatorios/frequencia/{atletaId}. O backend
 * exige `data_inicio`/`data_fim` (400 se ausentes ou se `data_fim` for
 * anterior a `data_inicio`) — por isso só dispara quando um atleta foi
 * selecionado E o período passa em `periodoSchema` (mesma validação usada
 * no `PeriodoPicker`, evita um 400 previsível).
 */
export function useFrequenciaAtleta(atletaId: string | undefined, periodo: PeriodoFilter) {
  const periodoValido = isPeriodoValido(periodo);

  return useQuery({
    queryKey: ["relatorios", "frequencia-atleta", atletaId, periodo],
    queryFn: () => relatorioService.getFrequenciaAtleta(atletaId!, periodo),
    enabled: Boolean(atletaId) && periodoValido,
  });
}
