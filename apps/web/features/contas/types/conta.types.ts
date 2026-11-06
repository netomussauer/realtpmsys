/**
 * Tipos do contexto Contas (gestão de usuários) — bate com os DTOs do
 * backend Go (internal/infrastructure/http/handler/usuario_handler.go).
 *
 * O backend NUNCA devolve `senha_hash`. A senha temporária (`senha_temporaria`)
 * aparece só nas respostas de criação e de redefinição, uma única vez.
 */

import type { Perfil } from "@/features/auth/types/auth.types";

export type { Perfil };

export type AcaoStatusConta = "ativar" | "desativar";

export interface ContaDTO {
  id: string;
  email: string;
  nome: string; // "" quando a conta não tem nome (ex.: contas semeadas)
  perfil: Perfil;
  ativo: boolean;
  deve_trocar_senha: boolean;
  criado_em: string;     // ISO timestamp
  atualizado_em: string; // ISO timestamp
}

/** Resposta de POST /usuarios e POST /usuarios/{id}/redefinir-senha */
export interface ContaComSenhaDTO extends ContaDTO {
  senha_temporaria: string;
}

export interface ContaFilter {
  busca?: string;
  perfil?: Perfil;
  /** "true" | "false" — o backend lê via strconv.ParseBool */
  ativo?: "true" | "false";
  page?: number;
  per_page?: number;
}

export interface ContaListResponse {
  data: ContaDTO[];
  pagination: {
    total: number;
    page: number;
    per_page: number;
  };
}
