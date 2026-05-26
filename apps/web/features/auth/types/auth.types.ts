/**
 * Tipos do contexto de autenticação compartilhados entre BFF, hooks e
 * componentes.
 *
 * Perfil bate com o que o backend Go retorna em claims.perfil do JWT
 * (vide internal/domain/identidade/entity.go).
 */

export type Perfil = "ADMIN" | "TREINADOR" | "RESPONSAVEL";

/**
 * Dados da sessão expostos ao cliente via `/api/auth/session`.
 * O JWT bruto NUNCA sai dos cookies httpOnly — esta interface é o que
 * componentes React podem ler.
 */
export interface Session {
  userId: string;
  email: string;
  perfil: Perfil;
  accessExpiresAt: string;  // ISO 8601
}

/**
 * Resposta do backend Go ao POST /auth/login.
 * Espelha auth_handler.go loginResponse.
 */
export interface BackendLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_at: string;          // ISO
  refresh_expires_at: string;  // ISO
  user_id: string;
  perfil: Perfil;
}

/** Claims que o backend Go embute no JWT — vide internal/application/identidade/use_cases.go */
export interface AccessTokenClaims {
  user_id: string;
  perfil: Perfil;
  typ: "access" | "refresh";
  exp: number;
  iat: number;
  sub: string;
}
