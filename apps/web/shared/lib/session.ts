/**
 * Utilities server-side de sessão.
 *
 * Centraliza:
 *   - nomes de cookies (constantes — evita typo)
 *   - opções padrão de Set-Cookie
 *   - leitura/escrita de cookies a partir do Next 15 (cookies() é async)
 *   - decode/verify de JWT via `jose`
 *
 * NÃO importa de lugares client-side. Use em route handlers, layouts
 * server-side e middleware.
 */

import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import type {
  AccessTokenClaims,
  BackendLoginResponse,
  Session,
} from "@/features/auth/types/auth.types";

// ─────────────────────────────────────────────────────────────────────────────
// Nomes de cookies. Prefixo `rtpm_` para isolar dos outros apps no mesmo domínio.
// ─────────────────────────────────────────────────────────────────────────────

export const ACCESS_COOKIE = "rtpm_access";
export const REFRESH_COOKIE = "rtpm_refresh";
export const SESSION_COOKIE = "rtpm_session";

// ─────────────────────────────────────────────────────────────────────────────
// Configurações padrão de cookie. Todos httpOnly + secure (quando HTTPS).
// sameSite=lax permite POST navegacional (formulários cross-origin com
// pre-flight ok); usar `strict` quebra fluxos de redirect 3rd-party. Como
// não temos OAuth, lax é seguro.
//
// `secure: true` faz o browser NUNCA enviar o cookie em conexões HTTP — o
// que quebra o lab K3s que serve via MetalLB em HTTP puro (sem TLS termination).
// A flag COOKIE_SECURE permite override explícito. Padrão:
//   - NODE_ENV=production E COOKIE_SECURE != "false" → secure=true
//   - caso contrário (dev ou COOKIE_SECURE=false em prod sem TLS) → secure=false
//
// Em deploys reais com HTTPS, omitir COOKIE_SECURE (ou setar "true").
// ─────────────────────────────────────────────────────────────────────────────

function shouldUseSecureCookie(): boolean {
  if (process.env.COOKIE_SECURE === "false") return false;
  if (process.env.COOKIE_SECURE === "true") return true;
  return process.env.NODE_ENV === "production";
}

const isSecureCookie = shouldUseSecureCookie();

interface CookieSetOptions {
  maxAgeSeconds: number;
}

function baseCookieOptions({ maxAgeSeconds }: CookieSetOptions) {
  return {
    httpOnly: true,
    secure: isSecureCookie,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify JWT — usado pra (1) extrair claims e (2) garantir que o cookie não
// foi forjado. Mesmo secret do backend Go (SealedSecret no K3s).
// ─────────────────────────────────────────────────────────────────────────────

function getSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET não setado. Em dev local, copie .env.example para .env.local " +
        "e use o mesmo segredo do backend Go (config.JWT.Secret).",
    );
  }
  return new TextEncoder().encode(secret);
}

/**
 * Verifica assinatura HMAC e extrai claims. Lança se assinatura inválida
 * ou expirado. Use try/catch no chamador para distinguir "sem sessão" de
 * "sessão inválida".
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenClaims> {
  const { payload } = await jwtVerify(token, getSecretKey(), {
    algorithms: ["HS256"],
  });
  // jose já valida exp. Cast pra nosso shape.
  return payload as unknown as AccessTokenClaims;
}

// ─────────────────────────────────────────────────────────────────────────────
// Escrita: chamado pelo /api/auth/login após o backend devolver os tokens.
// Grava 3 cookies: access (curto), refresh (longo) e session (JSON pra UI).
// ─────────────────────────────────────────────────────────────────────────────

interface SessionPayload {
  email: string;
}

export async function setSessionCookies(
  resp: BackendLoginResponse,
  extras: SessionPayload,
): Promise<void> {
  const store = await cookies();

  const accessExpires = new Date(resp.expires_at);
  const refreshExpires = new Date(resp.refresh_expires_at);
  const now = new Date();
  const accessTtl = Math.max(60, Math.floor((accessExpires.getTime() - now.getTime()) / 1000));
  const refreshTtl = Math.max(60, Math.floor((refreshExpires.getTime() - now.getTime()) / 1000));

  store.set(ACCESS_COOKIE, resp.access_token, baseCookieOptions({ maxAgeSeconds: accessTtl }));
  store.set(REFRESH_COOKIE, resp.refresh_token, baseCookieOptions({ maxAgeSeconds: refreshTtl }));

  const session: Session = {
    userId: resp.user_id,
    email: extras.email,
    perfil: resp.perfil,
    accessExpiresAt: resp.expires_at,
  };
  store.set(SESSION_COOKIE, JSON.stringify(session), baseCookieOptions({ maxAgeSeconds: refreshTtl }));
}

/**
 * Atualiza apenas o access_token (chamado após refresh bem-sucedido).
 * Mantém refresh + session intactos.
 */
export async function updateAccessCookie(newAccessToken: string, expiresAt: string): Promise<void> {
  const store = await cookies();
  const ttl = Math.max(
    60,
    Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000),
  );
  store.set(ACCESS_COOKIE, newAccessToken, baseCookieOptions({ maxAgeSeconds: ttl }));

  // Atualiza accessExpiresAt no session cookie (sem perder email).
  const sessionRaw = store.get(SESSION_COOKIE)?.value;
  if (sessionRaw) {
    try {
      const parsed = JSON.parse(sessionRaw) as Session;
      parsed.accessExpiresAt = expiresAt;
      store.set(
        SESSION_COOKIE,
        JSON.stringify(parsed),
        baseCookieOptions({ maxAgeSeconds: ttl * 2 }),
      );
    } catch {
      // Cookie corrompido — deixa o usuário relogar.
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Leitura (server-side). Use em layouts, route handlers e Server Components.
// ─────────────────────────────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

/**
 * Devolve a sessão sem validar o JWT (lê do cookie session_json).
 *
 * Use quando só precisa dos metadados pra UI (sidebar, header). Quando
 * precisar fazer chamada de API protegida, leia o access_token e mande
 * pro backend — ele vai validar a assinatura de toda forma.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    return null;
  }
}

/**
 * Versão estrita: além de ler o session JSON, valida o access_token via
 * jose. Use em route handlers que tomam decisão de autorização —
 * garante que o cookie não foi forjado.
 *
 * Retorna null quando: sem cookie, JWT inválido ou expirado.
 */
export async function getVerifiedSession(): Promise<Session | null> {
  const accessToken = await getAccessToken();
  const session = await getSession();
  if (!accessToken || !session) return null;
  try {
    const claims = await verifyAccessToken(accessToken);
    // Sanity: claims do JWT devem bater com o session JSON. Defesa em
    // profundidade caso alguém edite só o session cookie via DevTools.
    if (claims.user_id !== session.userId || claims.perfil !== session.perfil) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Limpeza (logout).
// ─────────────────────────────────────────────────────────────────────────────

export async function clearSessionCookies(): Promise<void> {
  const store = await cookies();
  // maxAge=0 instrui o browser a expirar imediatamente.
  for (const name of [ACCESS_COOKIE, REFRESH_COOKIE, SESSION_COOKIE]) {
    store.set(name, "", baseCookieOptions({ maxAgeSeconds: 0 }));
  }
}
