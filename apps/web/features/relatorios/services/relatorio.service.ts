/**
 * Cliente HTTP da feature Relatórios — usa o `apiClient`/`toQueryString`
 * compartilhados de `@/shared/lib/api-client` (chama o proxy /api/v1/*
 * deste Next, NÃO o backend Go diretamente). NÃO duplica o helper — mesmo
 * achado de code-review já corrigido em features/turmas, features/frequencia
 * e features/financeiro.
 *
 * Os 3 relatórios são somente leitura — sem CRUD, sem sub-recursos (vide
 * types/relatorio.types.ts para o contrato completo, verificado direto no
 * Go, não no openapi.yaml).
 */

import { apiClient, toQueryString } from "@/shared/lib/api-client";
import type {
  InadimplenciaResponse,
  InadimplenciaFilter,
  FrequenciaAtletaResponse,
  FrequenciaTurmaResponse,
  PeriodoFilter,
} from "@/features/relatorios/types/relatorio.types";

// toQueryString espera Record<string, ...>; os filtros (sem index
// signature próprio) não são estruturalmente atribuíveis mesmo tendo só
// chaves compatíveis — limitação do TS, não um risco real aqui (mesmo
// padrão de features/turmas/services/turma.service.ts). PeriodoFilter tem
// os 2 campos obrigatórios (sem `?`), então o TS considera o overlap
// insuficiente pra um `as` direto — precisa do `as unknown as` que o
// próprio compilador sugere (InadimplenciaFilter, com campos opcionais,
// não precisa desse passo extra).
type QueryableFilter = Record<string, string | number | undefined>;

export const relatorioService = {
  /** GET /relatorios/inadimplencia — ambos os parâmetros são opcionais. */
  getInadimplencia(filter: InadimplenciaFilter = {}): Promise<InadimplenciaResponse> {
    return apiClient<InadimplenciaResponse>(
      `/relatorios/inadimplencia${toQueryString(filter as QueryableFilter)}`,
    );
  },

  /**
   * GET /relatorios/frequencia/{atletaId} — data_inicio/data_fim são
   * obrigatórios (backend responde 400 sem eles); quem chama garante isso
   * via `periodoSchema` antes de disparar a query (vide use-frequencia-atleta.ts).
   */
  getFrequenciaAtleta(
    atletaId: string,
    periodo: PeriodoFilter,
  ): Promise<FrequenciaAtletaResponse> {
    return apiClient<FrequenciaAtletaResponse>(
      `/relatorios/frequencia/${atletaId}${toQueryString(periodo as unknown as QueryableFilter)}`,
    );
  },

  /** GET /relatorios/frequencia/turma/{turmaId} — mesma obrigatoriedade de período. */
  getFrequenciaTurma(
    turmaId: string,
    periodo: PeriodoFilter,
  ): Promise<FrequenciaTurmaResponse> {
    return apiClient<FrequenciaTurmaResponse>(
      `/relatorios/frequencia/turma/${turmaId}${toQueryString(periodo as unknown as QueryableFilter)}`,
    );
  },
};
