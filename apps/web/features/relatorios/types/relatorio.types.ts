/**
 * Tipos do contexto Relatórios (Inadimplência + Frequência por Atleta/Turma)
 * — bate com os DTOs do backend Go (vide
 * internal/infrastructure/http/handler/relatorio_handler.go e
 * internal/application/relatorio/dto.go).
 *
 * IMPORTANTE: contrato verificado direto no código Go, NÃO no
 * docs/openapi.yaml (já comprovadamente desatualizado neste projeto em
 * vários pontos — vide features/turmas, features/frequencia,
 * features/financeiro). Particularidades relevantes:
 *   - Os 3 relatórios são somente leitura — sem CRUD, sem sub-recursos.
 *   - `GET /relatorios/inadimplencia` não pagina (`data` é a lista
 *     completa) e `competencia_ano`/`competencia_mes` são OPCIONAIS.
 *   - `GET /relatorios/frequencia/{atletaId}` e
 *     `GET /relatorios/frequencia/turma/{turmaId}` exigem
 *     `data_inicio`/`data_fim` (backend responde 400 se ausentes ou se
 *     `data_fim < data_inicio`).
 *   - Granularidade de permissão DIFERENTE entre os 3: Inadimplência é
 *     ADMIN only; os dois relatórios de Frequência são ADMIN + TREINADOR
 *     (vide router.go). Não há campo no payload que sinalize isso — é
 *     tratado só na UI (usePermission) e no middleware do backend.
 */

// ── Inadimplência ───────────────────────────────────────────────────────

/** Item de GET /relatorios/inadimplencia — uma mensalidade em aberto/vencida. */
export interface InadimplenciaItemDTO {
  mensalidade_id: string;
  atleta_id: string;
  atleta_nome: string;
  atleta_telefone?: string | null;
  atleta_email?: string | null;
  competencia_ano: number;
  competencia_mes: number;
  data_vencimento: string; // YYYY-MM-DD
  valor: string; // decimal como string — mesmo padrão de features/financeiro
  status: string; // ex.: "VENCIDO", "PENDENTE"
  dias_em_atraso: number;
}

/** `resumo` embutido em GET /relatorios/inadimplencia — já calculado pelo backend. */
export interface InadimplenciaResumo {
  total_mensalidades: number;
  total_atletas: number;
  total_devido: string; // decimal como string
}

/** Resposta de GET /relatorios/inadimplencia — lista completa, SEM paginação. */
export interface InadimplenciaResponse {
  data: InadimplenciaItemDTO[];
  resumo: InadimplenciaResumo;
}

/** Filtro de competência — os dois campos são opcionais (omitir = todas). */
export interface InadimplenciaFilter {
  competencia_ano?: number;
  competencia_mes?: number; // 1-12 quando informado
}

// ── Frequência por Atleta ───────────────────────────────────────────────

/**
 * Resposta de GET /relatorios/frequencia/{atletaId} — resumo único (não é
 * lista). `taxa_presenca_pc` (0..100) considera só PRESENTE como presença
 * efetiva — JUSTIFICADO entra em `total` mas não na taxa.
 */
export interface FrequenciaAtletaResponse {
  atleta_id: string;
  data_inicio: string; // YYYY-MM-DD
  data_fim: string; // YYYY-MM-DD
  presentes: number;
  ausentes: number;
  justificados: number;
  total: number;
  taxa_presenca_pc: number;
}

// ── Frequência por Turma ────────────────────────────────────────────────

/** Item de GET /relatorios/frequencia/turma/{turmaId} — um atleta da turma. */
export interface FrequenciaTurmaItemDTO {
  atleta_id: string;
  atleta_nome: string; // já vem pronto — não precisa resolver via useAtleta
  presentes: number;
  ausentes: number;
  justificados: number;
  total: number;
  taxa_presenca_pc: number;
}

/** Resposta de GET /relatorios/frequencia/turma/{turmaId}. */
export interface FrequenciaTurmaResponse {
  turma_id: string;
  data_inicio: string;
  data_fim: string;
  total_treinos: number;
  data: FrequenciaTurmaItemDTO[];
}

// ── Filtro de período (compartilhado pelos 2 relatórios de frequência) ──

/** `data_inicio`/`data_fim` são obrigatórios nos 2 endpoints de frequência. */
export interface PeriodoFilter {
  data_inicio: string; // YYYY-MM-DD
  data_fim: string; // YYYY-MM-DD
}
