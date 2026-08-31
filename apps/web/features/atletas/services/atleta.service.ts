/**
 * Cliente HTTP da feature Atletas — usa o `apiClient` compartilhado
 * (chama o proxy /api/v1/* deste Next, NÃO o backend Go diretamente).
 */

import { apiClient, toQueryString } from "@/shared/lib/api-client";
import type {
  AtletaDTO,
  AtletaFilter,
  AtletaListResponse,
  ResponsavelDTO,
  UniformeDTO,
  AcaoStatus,
} from "@/features/atletas/types/atleta.types";
import type { AtletaFormData } from "@/features/atletas/schemas/atleta.schema";
import type { ResponsavelFormData } from "@/features/atletas/schemas/responsavel.schema";
import type { UniformeFormData } from "@/features/atletas/schemas/uniforme.schema";

// toQueryString espera Record<string, ...>; AtletaFilter (sem index signature
// próprio) não é estruturalmente atribuível mesmo tendo só chaves compatíveis
// — limitação do TS, não um risco real aqui.
type QueryableFilter = Record<string, string | number | undefined>;

// ─────────────────────────────────────────────────────────────────────────────
// Atletas — CRUD
// ─────────────────────────────────────────────────────────────────────────────

export const atletaService = {
  list(filter: AtletaFilter = {}): Promise<AtletaListResponse> {
    return apiClient<AtletaListResponse>(
      `/atletas${toQueryString(filter as QueryableFilter)}`,
    );
  },

  getById(id: string): Promise<AtletaDTO> {
    return apiClient<AtletaDTO>(`/atletas/${id}`);
  },

  cadastrar(data: AtletaFormData): Promise<AtletaDTO> {
    return apiClient<AtletaDTO>("/atletas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  atualizar(id: string, data: AtletaFormData): Promise<AtletaDTO> {
    return apiClient<AtletaDTO>(`/atletas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  mudarStatus(id: string, acao: AcaoStatus): Promise<AtletaDTO> {
    return apiClient<AtletaDTO>(`/atletas/${id}/${acao}`, { method: "PATCH" });
  },

  remover(id: string): Promise<void> {
    return apiClient<void>(`/atletas/${id}`, { method: "DELETE" });
  },

  // ── Sub-recursos ────────────────────────────────────────────────────────

  listResponsaveis(atletaId: string): Promise<{ data: ResponsavelDTO[] }> {
    return apiClient<{ data: ResponsavelDTO[] }>(`/atletas/${atletaId}/responsaveis`);
  },

  adicionarResponsavel(
    atletaId: string,
    data: ResponsavelFormData,
  ): Promise<ResponsavelDTO> {
    return apiClient<ResponsavelDTO>(`/atletas/${atletaId}/responsaveis`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getUniforme(atletaId: string): Promise<UniformeDTO | null> {
    // Backend devolve 404 quando não há uniforme. Tratamos como null.
    return apiClient<UniformeDTO>(`/atletas/${atletaId}/uniforme`).catch((err) => {
      if (err instanceof Error && err.message.includes("404")) return null;
      throw err;
    });
  },

  setUniforme(atletaId: string, data: UniformeFormData): Promise<UniformeDTO> {
    return apiClient<UniformeDTO>(`/atletas/${atletaId}/uniforme`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};
