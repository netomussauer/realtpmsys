/**
 * Tipos do contexto Frequência (Treino + lançamento de presença) — bate
 * com os DTOs do backend Go (vide
 * internal/infrastructure/http/handler/treino_handler.go).
 *
 * IMPORTANTE: contrato verificado direto no código Go, NÃO no
 * docs/openapi.yaml (já comprovadamente desatualizado neste projeto em
 * pontos parecidos — vide features/turmas). Particularidades:
 *   - Não existe `GET /treinos/{id}` — só criação e listagem por turma
 *     (`GET /turmas/{turmaId}/treinos`). Ver treino-detail-view.tsx para
 *     como a página de detalhe contorna essa ausência.
 *   - `POST /treinos/{id}/frequencias` é um lançamento em lote e devolve
 *     só um resumo (`LancarFrequenciasResponse`), não a lista atualizada.
 */

export type Presenca = "PRESENTE" | "AUSENTE" | "JUSTIFICADO";

/** Resposta de POST/GET (item) /turmas/{turmaId}/treinos */
export interface TreinoDTO {
  id: string;
  turma_id: string;
  data_treino: string; // YYYY-MM-DD
  hora_inicio?: string; // "HH:MM" — ausente quando não informado (omitempty no Go)
  hora_fim?: string;
  observacao?: string | null;
  criado_em: string; // ISO timestamp
}

/** Resposta de GET /turmas/{turmaId}/treinos (paginada) */
export interface TreinoListResponse {
  data: TreinoDTO[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}

/**
 * Filtro de listagem de treinos — bate com TreinoHandler.List. `per_page`
 * default do backend é 30 (diferente do default 20 usado em outras listas
 * do projeto, ex. Turmas/Atletas).
 */
export interface TreinoFilter {
  data_inicio?: string; // YYYY-MM-DD
  data_fim?: string; // YYYY-MM-DD
  page?: number;
  per_page?: number;
}

/** Item de GET /treinos/{treinoId}/frequencias */
export interface FrequenciaDTO {
  id: string;
  treino_id: string;
  atleta_id: string;
  presenca: Presenca;
  justificativa?: string | null;
  registrado_em: string; // ISO timestamp
}

/** Resposta de GET /treinos/{treinoId}/frequencias — lista flat, sem paginação. */
export interface FrequenciaListResponse {
  data: FrequenciaDTO[];
}

/**
 * Resposta de POST /treinos/{treinoId}/frequencias — só um resumo do
 * lançamento em lote, NÃO a lista de frequências atualizada. Depois de
 * lançar, a query de listagem (`use-frequencias.ts`) é invalidada para
 * buscar o estado atualizado.
 */
export interface LancarFrequenciasResponse {
  treino_id: string;
  total: number;
}
