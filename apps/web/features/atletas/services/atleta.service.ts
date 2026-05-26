/**
 * Cliente HTTP da feature Atletas — chama o proxy /api/v1/* deste Next,
 * NÃO o backend Go diretamente. O proxy injeta o JWT do cookie httpOnly.
 *
 * Erros HTTP viram exceções com mensagem do backend (RFC 7807-friendly)
 * — TanStack Query capture pela camada de hooks.
 */

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

// ─────────────────────────────────────────────────────────────────────────────
// Helper de fetch que lida com erros do backend.
// ─────────────────────────────────────────────────────────────────────────────

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
    title?: string;
  };

  if (!res.ok) {
    const msg =
      json.detail || json.title || json.error || `Erro ${res.status}`;
    throw new Error(msg);
  }

  return json as T;
}

// Monta query string a partir do filtro (ignora chaves vazias/undefined).
function toQueryString(filter: AtletaFilter): string {
  const params = new URLSearchParams();
  if (filter.nome) params.set("nome", filter.nome);
  if (filter.status) params.set("status", filter.status);
  if (filter.page) params.set("page", String(filter.page));
  if (filter.per_page) params.set("per_page", String(filter.per_page));
  const s = params.toString();
  return s ? `?${s}` : "";
}

// ─────────────────────────────────────────────────────────────────────────────
// Atletas — CRUD
// ─────────────────────────────────────────────────────────────────────────────

export const atletaService = {
  list(filter: AtletaFilter = {}): Promise<AtletaListResponse> {
    return api<AtletaListResponse>(`/atletas${toQueryString(filter)}`);
  },

  getById(id: string): Promise<AtletaDTO> {
    return api<AtletaDTO>(`/atletas/${id}`);
  },

  cadastrar(data: AtletaFormData): Promise<AtletaDTO> {
    return api<AtletaDTO>("/atletas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  atualizar(id: string, data: AtletaFormData): Promise<AtletaDTO> {
    return api<AtletaDTO>(`/atletas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  mudarStatus(id: string, acao: AcaoStatus): Promise<AtletaDTO> {
    return api<AtletaDTO>(`/atletas/${id}/${acao}`, { method: "PATCH" });
  },

  remover(id: string): Promise<void> {
    return api<void>(`/atletas/${id}`, { method: "DELETE" });
  },

  // ── Sub-recursos ────────────────────────────────────────────────────────

  listResponsaveis(atletaId: string): Promise<{ data: ResponsavelDTO[] }> {
    return api<{ data: ResponsavelDTO[] }>(`/atletas/${atletaId}/responsaveis`);
  },

  adicionarResponsavel(
    atletaId: string,
    data: ResponsavelFormData,
  ): Promise<ResponsavelDTO> {
    return api<ResponsavelDTO>(`/atletas/${atletaId}/responsaveis`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  getUniforme(atletaId: string): Promise<UniformeDTO | null> {
    // Backend devolve 404 quando não há uniforme. Tratamos como null.
    return api<UniformeDTO>(`/atletas/${atletaId}/uniforme`).catch((err) => {
      if (err instanceof Error && err.message.includes("404")) return null;
      throw err;
    });
  },

  setUniforme(atletaId: string, data: UniformeFormData): Promise<UniformeDTO> {
    return api<UniformeDTO>(`/atletas/${atletaId}/uniforme`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};
