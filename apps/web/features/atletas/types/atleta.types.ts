/**
 * Tipos do contexto Atletas — bate com os DTOs do backend Go
 * (vide internal/infrastructure/http/handler/atleta_handler.go e
 * responsavel_handler.go).
 *
 * Diferença vs Atleta do domínio Go: aqui datas são strings ISO
 * (vem serializadas no JSON), uuid também é string.
 */

export type AtletaStatus = "ATIVO" | "INATIVO" | "SUSPENSO";

export type Parentesco = "PAI" | "MAE" | "AVO" | "OUTRO";

export type TamanhoUniforme = "PP" | "P" | "M" | "G" | "GG" | "XGG";

/** Resposta de GET /atletas/{id} e itens de GET /atletas */
export interface AtletaDTO {
  id: string;
  nome: string;
  data_nascimento: string; // YYYY-MM-DD
  idade: number;
  cpf?: string | null;
  rg?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  uf?: string | null;
  cep?: string | null;
  email?: string | null;
  telefone?: string | null;
  status: AtletaStatus;
  criado_em: string;     // ISO timestamp
  atualizado_em: string; // ISO timestamp
}

/** Resposta de GET /atletas (paginada) */
export interface AtletaListResponse {
  data: AtletaDTO[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}

/** Filtro de listagem — usado pelo hook e mapeado para query string */
export interface AtletaFilter {
  nome?: string;
  status?: AtletaStatus;
  page?: number;
  per_page?: number;
}

export interface ResponsavelDTO {
  id: string;
  atleta_id: string;
  nome: string;
  telefone: string;
  parentesco: Parentesco;
  cpf?: string | null;
  email?: string | null;
  contato_principal: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface UniformeDTO {
  id: string;
  atleta_id: string;
  tam_camisa: TamanhoUniforme;
  tam_short: TamanhoUniforme;
  tam_chuteira: string; // numérico em string ("36", "37")
  atualizado_em: string;
}

/** Ação de mudança de status — bate com PATCH /atletas/{id}/(inativar|suspender|reativar) */
export type AcaoStatus = "inativar" | "suspender" | "reativar";
