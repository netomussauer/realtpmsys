import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/shared/lib/session";
import type { Perfil, Session } from "@/features/auth/types/auth.types";

/**
 * Middleware Next.js — primeiro filtro de autenticação e autorização.
 *
 * **Importante**: roda no Edge Runtime. Não usa `cookies()` (server-only),
 * lê via `req.cookies.get()`. Não pode importar `jose` aqui pq `jwtVerify`
 * é async e o middleware idealmente é síncrono pra latência baixa — a
 * verificação real do JWT fica no route handler. Aqui só checamos
 * presença do session cookie (o BFF garante que só grava após verify).
 *
 * Regras:
 *   - rotas em `(app)/*` exigem sessão; sem cookie → redirect /login?next=...
 *   - perfil RESPONSAVEL só vê rotas listadas em `responsavelAllowed`
 *   - perfil TREINADOR não acessa /mensalidades
 *   - tentar acessar /login com sessão ativa → redirect /dashboard
 *
 * Defesa em profundidade: o backend Go SEMPRE valida JWT + perfil
 * (RequirePerfil + filtros por usuario_responsavel_id). Mesmo se o
 * middleware errar, nenhum dado vaza pelo backend.
 */

/** Rotas protegidas — qualquer prefixo aqui exige sessão. */
const PROTECTED_PREFIXES = ["/dashboard", "/atletas", "/turmas", "/treinos", "/mensalidades", "/relatorios"];

/** Quando o RESPONSAVEL acessa essas rotas, redireciona pro dashboard. */
const ADMIN_ONLY_PREFIXES = ["/turmas", "/treinos", "/relatorios"];

/** Quando o TREINADOR acessa essas, redireciona. */
const TREINADOR_BLOCKED_PREFIXES = ["/mensalidades"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function hasPrefix(pathname: string, prefixes: ReadonlyArray<string>): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function parseSessionCookie(value: string | undefined): Session | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as Session;
  } catch {
    return null;
  }
}

function perfilTemAcesso(perfil: Perfil, pathname: string): boolean {
  if (perfil === "ADMIN") return true;
  if (perfil === "RESPONSAVEL") {
    // Responsável só acessa dashboard, atletas (filtrado) e mensalidades (filtrado).
    return !hasPrefix(pathname, ADMIN_ONLY_PREFIXES);
  }
  // TREINADOR — bloqueia financeiro.
  if (perfil === "TREINADOR") {
    return !hasPrefix(pathname, TREINADOR_BLOCKED_PREFIXES);
  }
  return false;
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const sessionCookie = req.cookies.get(SESSION_COOKIE)?.value;
  const session = parseSessionCookie(sessionCookie);

  // 1. Acessando /login já autenticado → manda pra dashboard.
  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 2. Acessando área protegida sem sessão → redirect pro login.
  if (isProtected(pathname) && !session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Autenticado mas sem perfil pra essa rota → manda pro dashboard.
  if (isProtected(pathname) && session && !perfilTemAcesso(session.perfil, pathname)) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

/**
 * `matcher` restringe os paths em que o middleware roda. Excluímos:
 *   - `/_next/*` (build assets)
 *   - `/api/*` (route handlers cuidam de auth próprios; não queremos
 *     loop nem latência extra)
 *   - arquivos estáticos comuns (.svg, .png, etc.)
 *
 * Tudo o mais passa pelo middleware.
 */
export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.webp).*)",
  ],
};
