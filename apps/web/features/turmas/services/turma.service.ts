/**
 * Cliente HTTP da feature Turmas — usa o `apiClient` compartilhado
 * (chama o proxy /api/v1/* deste Next, NÃO o backend Go diretamente).
 *
 * Também expõe `listTreinadores`/`listCampos` — pickers auxiliares de
 * só-leitura usados para popular selects do formulário de turma. NÃO são
 * uma feature completa de Treinadores/Campos (fora de escopo aqui).
 */

import { apiClient, toQueryString } from "@/shared/lib/api-client";
import type {
  TurmaDTO,
  TurmaFilter,
  TurmaListResponse,
  AcaoStatusTurma,
  MatriculaDTO,
  MatriculaFilter,
  MatriculaListResponse,
  TreinadorListResponse,
  CampoListResponse,
} from "@/features/turmas/types/turma.types";
import type { TurmaFormData } from "@/features/turmas/schemas/turma.schema";
import type { MatriculaFormData } from "@/features/turmas/schemas/matricula.schema";

// toQueryString espera Record<string, ...>; TurmaFilter/MatriculaFilter (sem
// index signature próprio) não são estruturalmente atribuíveis mesmo tendo só
// chaves compatíveis — limitação do TS, não um risco real aqui.
type QueryableFilter = Record<string, string | number | undefined>;

// ─────────────────────────────────────────────────────────────────────────────
// Turmas — CRUD + transições de status
// ─────────────────────────────────────────────────────────────────────────────

export const turmaService = {
  list(filter: TurmaFilter = {}): Promise<TurmaListResponse> {
    return apiClient<TurmaListResponse>(`/turmas${toQueryString(filter as QueryableFilter)}`);
  },

  getById(id: string): Promise<TurmaDTO> {
    return apiClient<TurmaDTO>(`/turmas/${id}`);
  },

  criar(data: TurmaFormData): Promise<TurmaDTO> {
    return apiClient<TurmaDTO>("/turmas", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  atualizar(id: string, data: TurmaFormData): Promise<TurmaDTO> {
    return apiClient<TurmaDTO>(`/turmas/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  mudarStatus(id: string, acao: AcaoStatusTurma): Promise<TurmaDTO> {
    return apiClient<TurmaDTO>(`/turmas/${id}/${acao}`, { method: "PATCH" });
  },

  // ── Matrículas (sub-recurso de turma) ───────────────────────────────────

  listMatriculas(
    turmaId: string,
    filter: MatriculaFilter = {},
  ): Promise<MatriculaListResponse> {
    return apiClient<MatriculaListResponse>(
      `/turmas/${turmaId}/matriculas${toQueryString(filter as QueryableFilter)}`,
    );
  },

  matricular(turmaId: string, data: MatriculaFormData): Promise<MatriculaDTO> {
    return apiClient<MatriculaDTO>(`/turmas/${turmaId}/matriculas`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Nota: cancelar matrícula NÃO é sub-rota de turma — é /matriculas/{id}/cancelar direto.
  cancelarMatricula(matriculaId: string): Promise<MatriculaDTO> {
    return apiClient<MatriculaDTO>(`/matriculas/${matriculaId}/cancelar`, {
      method: "PATCH",
    });
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Pickers auxiliares — só leitura, usados pelo formulário de turma.
// ─────────────────────────────────────────────────────────────────────────────

export function listTreinadores(
  filter: { page?: number; per_page?: number } = {},
): Promise<TreinadorListResponse> {
  return apiClient<TreinadorListResponse>(`/treinadores${toQueryString(filter)}`);
}

export function listCampos(
  filter: { page?: number; per_page?: number } = {},
): Promise<CampoListResponse> {
  return apiClient<CampoListResponse>(`/campos${toQueryString(filter)}`);
}
