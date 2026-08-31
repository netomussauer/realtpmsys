/**
 * Cliente HTTP da feature Frequência — usa o `apiClient`/`toQueryString`
 * compartilhados de `@/shared/lib/api-client` (chama o proxy /api/v1/*
 * deste Next, NÃO o backend Go diretamente). NÃO duplica o helper — isso
 * já foi um achado de code-review corrigido na feature Turmas.
 */

import { apiClient, toQueryString } from "@/shared/lib/api-client";
import type {
  TreinoDTO,
  TreinoListResponse,
  TreinoFilter,
  FrequenciaListResponse,
  LancarFrequenciasResponse,
} from "@/features/frequencia/types/frequencia.types";
import type { TreinoFormData } from "@/features/frequencia/schemas/treino.schema";
import type { FrequenciaLoteFormData } from "@/features/frequencia/schemas/frequencia.schema";

// toQueryString espera Record<string, ...>; TreinoFilter (sem index
// signature próprio) não é estruturalmente atribuível mesmo tendo só
// chaves compatíveis — limitação do TS, não um risco real aqui (mesmo
// padrão de features/turmas/services/turma.service.ts).
type QueryableFilter = Record<string, string | number | undefined>;

export const frequenciaService = {
  // ── Treinos (sub-recurso de turma — só criar + listar) ──────────────────

  listTreinos(turmaId: string, filter: TreinoFilter = {}): Promise<TreinoListResponse> {
    return apiClient<TreinoListResponse>(
      `/turmas/${turmaId}/treinos${toQueryString(filter as QueryableFilter)}`,
    );
  },

  criarTreino(turmaId: string, data: TreinoFormData): Promise<TreinoDTO> {
    return apiClient<TreinoDTO>(`/turmas/${turmaId}/treinos`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ── Frequências (sub-recurso de treino) ─────────────────────────────────

  listFrequencias(treinoId: string): Promise<FrequenciaListResponse> {
    return apiClient<FrequenciaListResponse>(`/treinos/${treinoId}/frequencias`);
  },

  /**
   * Lançamento em lote — idempotente (reenviar substitui os registros
   * anteriores). A resposta só traz um resumo (`LancarFrequenciasResponse`);
   * quem chama deve invalidar/refazer `listFrequencias` para ver o resultado.
   */
  lancarFrequencias(
    treinoId: string,
    data: FrequenciaLoteFormData,
  ): Promise<LancarFrequenciasResponse> {
    return apiClient<LancarFrequenciasResponse>(`/treinos/${treinoId}/frequencias`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
