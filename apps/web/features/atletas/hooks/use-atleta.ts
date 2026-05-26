"use client";

import { useQuery } from "@tanstack/react-query";
import { atletaService } from "@/features/atletas/services/atleta.service";

/**
 * useAtleta — detalhe do atleta por ID.
 *
 * `enabled: !!id` evita disparar a query enquanto o ID não estiver
 * disponível (ex.: durante hydration ou se vier de query string ainda
 * vazia). Sem isso, o backend pegaria GET /atletas/undefined.
 */
export function useAtleta(id: string | undefined) {
  return useQuery({
    queryKey: ["atletas", "detail", id],
    queryFn: () => atletaService.getById(id!),
    enabled: !!id,
  });
}

/** Lista de responsáveis do atleta — separada do detail por ter rota própria no backend. */
export function useResponsaveisDoAtleta(atletaId: string | undefined) {
  return useQuery({
    queryKey: ["atletas", "responsaveis", atletaId],
    queryFn: () => atletaService.listResponsaveis(atletaId!),
    enabled: !!atletaId,
  });
}

/** Uniforme do atleta (1:1). Pode ser null se ainda não cadastrado. */
export function useUniformeDoAtleta(atletaId: string | undefined) {
  return useQuery({
    queryKey: ["atletas", "uniforme", atletaId],
    queryFn: () => atletaService.getUniforme(atletaId!),
    enabled: !!atletaId,
  });
}
