/**
 * Tipos do contexto Turmas — bate com os DTOs do backend Go
 * (vide internal/infrastructure/http/handler/turma_handler.go e
 * matricula_handler.go).
 *
 * IMPORTANTE: contrato verificado direto no código Go, NÃO no
 * docs/openapi.yaml (desatualizado neste contexto — sem
 * `vagas_disponiveis`, sem `treinador` aninhado, sem `atleta_nome`
 * na matrícula).
 */

export type TurmaStatus = "ATIVA" | "ENCERRADA" | "SUSPENSA";

export type DiaSemana = "SEG" | "TER" | "QUA" | "QUI" | "SEX" | "SAB" | "DOM";

export type MatriculaStatus = "ATIVA" | "CANCELADA" | "TRANSFERIDA";

/** Ação de transição de status — bate com PATCH /turmas/{id}/(encerrar|suspender|reativar) */
export type AcaoStatusTurma = "encerrar" | "suspender" | "reativar";

export interface HorarioDTO {
  id: string;
  dia_semana: DiaSemana;
  hora_inicio: string; // "HH:MM"
  hora_fim: string;    // "HH:MM"
}

/** Resposta de GET /turmas/{id} e itens de GET /turmas */
export interface TurmaDTO {
  id: string;
  nome: string;
  faixa_etaria_min: number;
  faixa_etaria_max: number;
  capacidade_max: number;
  treinador_id?: string | null;
  campo_id?: string | null;
  status: TurmaStatus;
  horarios: HorarioDTO[];
  criado_em: string;     // ISO timestamp
  atualizado_em: string; // ISO timestamp
}

/** Resposta de GET /turmas (paginada) */
export interface TurmaListResponse {
  data: TurmaDTO[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}

/**
 * Filtro de listagem — usado pelo hook e mapeado para query string.
 *
 * Bate com TurmaHandler.List (internal/infrastructure/http/handler/turma_handler.go):
 * o backend lê `page`, `per_page`, `nome` e `status` — NÃO existe filtro por
 * treinador_id (nem no handler, nem no domainturma.TurmaListFilter, nem na
 * query SQL), apesar do que o docs/openapi.yaml (desatualizado) sugere.
 */
export interface TurmaFilter {
  nome?: string;
  status?: TurmaStatus;
  page?: number;
  per_page?: number;
}

/** Resposta de POST/GET /turmas/{id}/matriculas (item) */
export interface MatriculaDTO {
  id: string;
  atleta_id: string;
  turma_id: string;
  data_inicio: string;       // YYYY-MM-DD
  data_fim?: string | null;  // YYYY-MM-DD
  status: MatriculaStatus;
}

/** Resposta de GET /turmas/{id}/matriculas (paginada) */
export interface MatriculaListResponse {
  data: MatriculaDTO[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}

export interface MatriculaFilter {
  status?: MatriculaStatus;
  page?: number;
  per_page?: number;
}

// ── Pickers auxiliares (read-only, só para popular selects) ────────────────

export type TreinadorStatus = "ATIVO" | "INATIVO";

export interface TreinadorDTO {
  id: string;
  usuario_id: string;
  nome: string;
  cpf?: string | null;
  cref?: string | null;
  telefone?: string | null;
  status: TreinadorStatus;
  criado_em: string;
  atualizado_em: string;
}

export interface TreinadorListResponse {
  data: TreinadorDTO[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}

export interface CampoDTO {
  id: string;
  nome: string;
  endereco?: string | null;
  capacidade_max?: number | null;
  ativo: boolean;
}

export interface CampoListResponse {
  data: CampoDTO[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}
