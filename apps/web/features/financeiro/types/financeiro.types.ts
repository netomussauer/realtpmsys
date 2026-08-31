/**
 * Tipos do contexto Financeiro (Plano, Contrato, Mensalidade) — bate com
 * os DTOs do backend Go (vide internal/infrastructure/http/handler/
 * mensalidade_handler.go, contrato_handler.go, plano_handler.go).
 *
 * IMPORTANTE: contrato verificado direto no código Go, NÃO no
 * docs/openapi.yaml (já comprovadamente desatualizado neste projeto em
 * pontos parecidos — vide features/turmas, features/frequencia).
 * Particularidades relevantes:
 *   - `/contratos` só tem `POST /` — não existe GET (lista ou detalhe) nem
 *     rota de cancelamento, apesar do domínio ter `Contrato.Cancelar()`.
 *     Não há como listar contratos firmados no frontend hoje.
 *   - `MensalidadeResponse` NÃO expõe `contrato_id` nem `observacao`,
 *     mesmo a entidade de domínio tendo esses campos.
 *   - Valores monetários trafegam como string decimal (não number) — a
 *     API financeira evita o erro de arredondamento de ponto flutuante.
 */

export const MENSALIDADE_STATUS = [
  "PENDENTE",
  "PAGO",
  "VENCIDO",
  "CANCELADO",
  "ISENTO",
] as const;
export type MensalidadeStatus = (typeof MENSALIDADE_STATUS)[number];

/** Resposta de GET /mensalidades/{id} e itens de GET /mensalidades */
export interface MensalidadeDTO {
  id: string;
  atleta_id: string;
  competencia_ano: number;
  competencia_mes: number;
  data_vencimento: string; // YYYY-MM-DD
  valor: string; // decimal como string
  valor_pago?: string | null;
  status: MensalidadeStatus;
  data_pagamento?: string | null;
  forma_pagamento?: string | null;
}

/** `resumo` embutido em GET /mensalidades — já calculado pelo backend. */
export interface MensalidadeResumo {
  total_pendente: string;
  total_vencido: string;
  total_pago: string;
}

/** Resposta de GET /mensalidades (paginada, com resumo) */
export interface MensalidadeListResponse {
  data: MensalidadeDTO[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
  resumo: MensalidadeResumo;
}

/**
 * Filtro de listagem — bate com o que MensalidadeHandler.List lê da
 * query string. `atleta_id` só tem efeito quando quem chama é ADMIN: o
 * backend troca automaticamente para ListPorResponsavel/GetByIDPorResponsavel
 * com base no JWT quando quem chama é RESPONSAVEL, e IGNORA esse parâmetro
 * nesse caso.
 */
export interface MensalidadeFilter {
  atleta_id?: string;
  status?: MensalidadeStatus;
  page?: number;
  per_page?: number;
}

/** Resposta de POST /mensalidades/gerar — geração em lote, idempotente. */
export interface GerarMensalidadesResponse {
  geradas: number;
  ignoradas: number;
  com_erro: number;
}

export const CONTRATO_STATUS = ["ATIVO", "CANCELADO", "ENCERRADO"] as const;
export type ContratoStatus = (typeof CONTRATO_STATUS)[number];

/** Resposta de POST /contratos (201) — único formato de resposta desse recurso. */
export interface ContratoDTO {
  id: string;
  atleta_id: string;
  plano_id: string;
  data_inicio: string; // YYYY-MM-DD
  data_fim?: string | null;
  valor_contratado: string; // decimal como string
  status: ContratoStatus;
}

// ── Planos (leitura, só para popular o picker do formulário de contrato) ──

/** Item de GET /planos — só planos ativos, sem paginação explícita no formato. */
export interface PlanoDTO {
  id: string;
  nome: string;
  dias_semana: number;
  valor_mensal: string; // decimal como string
  dia_vencimento: number;
  ativo: boolean;
}

export interface PlanoListResponse {
  data: PlanoDTO[];
}
