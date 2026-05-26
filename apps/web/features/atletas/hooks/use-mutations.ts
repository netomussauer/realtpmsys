"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { atletaService } from "@/features/atletas/services/atleta.service";
import type {
  AtletaDTO,
  AcaoStatus,
} from "@/features/atletas/types/atleta.types";
import type { AtletaFormData } from "@/features/atletas/schemas/atleta.schema";
import type { ResponsavelFormData } from "@/features/atletas/schemas/responsavel.schema";
import type { UniformeFormData } from "@/features/atletas/schemas/uniforme.schema";

/**
 * Mutations da feature atletas — concentradas num único arquivo para evitar
 * boilerplate de 5+ arquivos com mesma estrutura.
 *
 * Invalidação:
 *   - List: invalida `["atletas", "list"]` (todas as combinações de filtro)
 *   - Detail/Sub-recursos: invalida `["atletas", "detail", id]` e específicos
 *
 * `invalidateQueries({ queryKey: ["atletas"] })` invalida TUDO da feature —
 * uso quando a mutation pode afetar list + detail simultaneamente (ex.:
 * mudança de status muda o badge na list e na página de detalhe).
 */

export function useCadastrarAtleta() {
  const qc = useQueryClient();
  return useMutation<AtletaDTO, Error, AtletaFormData>({
    mutationFn: (data) => atletaService.cadastrar(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atletas", "list"] });
    },
  });
}

export function useAtualizarAtleta(id: string) {
  const qc = useQueryClient();
  return useMutation<AtletaDTO, Error, AtletaFormData>({
    mutationFn: (data) => atletaService.atualizar(id, data),
    onSuccess: (updated) => {
      // Atualiza detail no cache em vez de re-fetch — economiza 1 round-trip.
      qc.setQueryData(["atletas", "detail", id], updated);
      qc.invalidateQueries({ queryKey: ["atletas", "list"] });
    },
  });
}

export function useMudarStatusAtleta() {
  const qc = useQueryClient();
  return useMutation<AtletaDTO, Error, { id: string; acao: AcaoStatus }>({
    mutationFn: ({ id, acao }) => atletaService.mudarStatus(id, acao),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["atletas", "detail", id] });
      qc.invalidateQueries({ queryKey: ["atletas", "list"] });
    },
  });
}

export function useRemoverAtleta() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => atletaService.remover(id),
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: ["atletas", "detail", id] });
      qc.invalidateQueries({ queryKey: ["atletas", "list"] });
    },
  });
}

export function useAdicionarResponsavel(atletaId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, ResponsavelFormData>({
    mutationFn: (data) => atletaService.adicionarResponsavel(atletaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atletas", "responsaveis", atletaId] });
      qc.invalidateQueries({ queryKey: ["atletas", "detail", atletaId] });
    },
  });
}

export function useSetUniforme(atletaId: string) {
  const qc = useQueryClient();
  return useMutation<unknown, Error, UniformeFormData>({
    mutationFn: (data) => atletaService.setUniforme(atletaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["atletas", "uniforme", atletaId] });
    },
  });
}
