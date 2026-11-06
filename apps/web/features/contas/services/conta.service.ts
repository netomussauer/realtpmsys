/**
 * Cliente HTTP da feature Contas — usa o `apiClient` compartilhado
 * (chama o proxy /api/v1/* deste Next, NÃO o backend Go diretamente).
 * Todas as rotas `/usuarios` são exclusivas de ADMIN no backend.
 */

import { apiClient, toQueryString } from "@/shared/lib/api-client";
import type {
  AcaoStatusConta,
  ContaComSenhaDTO,
  ContaDTO,
  ContaFilter,
  ContaListResponse,
} from "@/features/contas/types/conta.types";
import type {
  CriarContaFormData,
  EditarContaFormData,
} from "@/features/contas/schemas/conta.schema";

type QueryableFilter = Record<string, string | number | undefined>;

export const contaService = {
  list(filter: ContaFilter = {}): Promise<ContaListResponse> {
    return apiClient<ContaListResponse>(`/usuarios${toQueryString(filter as QueryableFilter)}`);
  },

  getById(id: string): Promise<ContaDTO> {
    return apiClient<ContaDTO>(`/usuarios/${id}`);
  },

  /** A resposta traz `senha_temporaria` — exibir uma vez e descartar. */
  criar(data: CriarContaFormData): Promise<ContaComSenhaDTO> {
    return apiClient<ContaComSenhaDTO>("/usuarios", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  atualizar(id: string, data: EditarContaFormData): Promise<ContaDTO> {
    return apiClient<ContaDTO>(`/usuarios/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  mudarStatus(id: string, acao: AcaoStatusConta): Promise<ContaDTO> {
    return apiClient<ContaDTO>(`/usuarios/${id}/${acao}`, { method: "PATCH" });
  },

  /** A resposta traz `senha_temporaria` — exibir uma vez e descartar. */
  redefinirSenha(id: string): Promise<ContaComSenhaDTO> {
    return apiClient<ContaComSenhaDTO>(`/usuarios/${id}/redefinir-senha`, { method: "POST" });
  },
};
