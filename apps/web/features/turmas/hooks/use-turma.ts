"use client";

import { useQuery } from "@tanstack/react-query";
import { turmaService } from "@/features/turmas/services/turma.service";

/**
 * useTurma — detalhe da turma por ID.
 *
 * `enabled: !!id` evita disparar a query enquanto o ID não estiver
 * disponível (ex.: durante hydration). Sem isso, o backend receberia
 * GET /turmas/undefined.
 */
export function useTurma(id: string | undefined) {
  return useQuery({
    queryKey: ["turmas", "detail", id],
    queryFn: () => turmaService.getById(id!),
    enabled: !!id,
  });
}
