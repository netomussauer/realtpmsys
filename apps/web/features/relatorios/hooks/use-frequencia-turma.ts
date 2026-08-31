"use client";

import { useQuery } from "@tanstack/react-query";
import { relatorioService } from "@/features/relatorios/services/relatorio.service";
import { isPeriodoValido } from "@/features/relatorios/schemas/periodo.schema";
import type { PeriodoFilter } from "@/features/relatorios/types/relatorio.types";

/**
 * useFrequenciaTurma — GET /relatorios/frequencia/turma/{turmaId}. Mesma
 * obrigatoriedade de período do relatório por atleta (vide
 * use-frequencia-atleta.ts) — só dispara com turma selecionada e período
 * válido.
 */
export function useFrequenciaTurma(turmaId: string | undefined, periodo: PeriodoFilter) {
  const periodoValido = isPeriodoValido(periodo);

  return useQuery({
    queryKey: ["relatorios", "frequencia-turma", turmaId, periodo],
    queryFn: () => relatorioService.getFrequenciaTurma(turmaId!, periodo),
    enabled: Boolean(turmaId) && periodoValido,
  });
}
