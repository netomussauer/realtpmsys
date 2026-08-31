/**
 * Cliente HTTP da feature Financeiro — usa o `apiClient`/`toQueryString`
 * compartilhados de `@/shared/lib/api-client` (chama o proxy /api/v1/*
 * deste Next, NÃO o backend Go diretamente). NÃO duplica o helper — mesmo
 * achado de code-review já corrigido em features/turmas e features/frequencia.
 *
 * Particularidades do contrato real (verificadas direto no Go, não no
 * openapi.yaml — vide types/financeiro.types.ts):
 *   - `/contratos` só tem `POST /` — sem list/get/cancelar.
 *   - `/planos` é só leitura aqui (picker do formulário de contrato) — não
 *     é uma feature completa de Planos (sem CRUD, sem página própria).
 */

import { apiClient, toQueryString } from "@/shared/lib/api-client";
import type {
  MensalidadeDTO,
  MensalidadeFilter,
  MensalidadeListResponse,
  GerarMensalidadesResponse,
  ContratoDTO,
  PlanoListResponse,
} from "@/features/financeiro/types/financeiro.types";
import type { PagamentoFormData } from "@/features/financeiro/schemas/pagamento.schema";
import type { GerarMensalidadesFormData } from "@/features/financeiro/schemas/gerar-mensalidades.schema";
import type { ContratoFormData } from "@/features/financeiro/schemas/contrato.schema";

// toQueryString espera Record<string, ...>; MensalidadeFilter (sem index
// signature próprio) não é estruturalmente atribuível mesmo tendo só
// chaves compatíveis — limitação do TS, não um risco real aqui (mesmo
// padrão de features/turmas/services/turma.service.ts).
type QueryableFilter = Record<string, string | number | undefined>;

export const financeiroService = {
  // ── Mensalidades ─────────────────────────────────────────────────────

  listMensalidades(filter: MensalidadeFilter = {}): Promise<MensalidadeListResponse> {
    return apiClient<MensalidadeListResponse>(
      `/mensalidades${toQueryString(filter as QueryableFilter)}`,
    );
  },

  getMensalidade(id: string): Promise<MensalidadeDTO> {
    return apiClient<MensalidadeDTO>(`/mensalidades/${id}`);
  },

  pagar(id: string, data: PagamentoFormData): Promise<MensalidadeDTO> {
    return apiClient<MensalidadeDTO>(`/mensalidades/${id}/pagar`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  cancelarMensalidade(id: string): Promise<MensalidadeDTO> {
    return apiClient<MensalidadeDTO>(`/mensalidades/${id}/cancelar`, {
      method: "PATCH",
    });
  },

  gerarMensalidades(data: GerarMensalidadesFormData): Promise<GerarMensalidadesResponse> {
    return apiClient<GerarMensalidadesResponse>(`/mensalidades/gerar`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // ── Contratos (só criar — não há list/get/cancelar no backend) ─────────

  firmarContrato(atletaId: string, data: ContratoFormData): Promise<ContratoDTO> {
    const payload = {
      atleta_id: atletaId,
      plano_id: data.plano_id,
      data_inicio: data.data_inicio,
      ...(data.valor_contratado ? { valor_contratado: data.valor_contratado } : {}),
    };
    return apiClient<ContratoDTO>("/contratos", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ── Planos (picker read-only) ───────────────────────────────────────

  listPlanosAtivos(): Promise<PlanoListResponse> {
    return apiClient<PlanoListResponse>("/planos");
  },
};
