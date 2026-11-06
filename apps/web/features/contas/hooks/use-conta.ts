"use client";

import { useQuery } from "@tanstack/react-query";
import { contaService } from "@/features/contas/services/conta.service";

/** useConta — detalhe de uma conta. Não dispara sem `id`. */
export function useConta(id: string | undefined) {
  return useQuery({
    queryKey: ["contas", "detail", id],
    queryFn: () => contaService.getById(id as string),
    enabled: !!id,
  });
}
