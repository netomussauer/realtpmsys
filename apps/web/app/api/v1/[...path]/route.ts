import { NextResponse, type NextRequest } from "next/server";
import { backendFetch, type BackendError } from "@/shared/lib/backend";
import {
  getAccessToken,
  getRefreshToken,
  updateAccessCookie,
  clearSessionCookies,
} from "@/shared/lib/session";

/**
 * Proxy genérico /api/v1/* — encaminha qualquer chamada do client para o
 * backend Go injetando o JWT do cookie httpOnly.
 *
 * Vantagens vs cliente chamar o backend direto:
 *   - JWT nunca exposto ao bundle JS (XSS-safe)
 *   - Refresh silencioso em 401 (cliente não percebe expiração)
 *   - Mesma origem → sem CORS, cookies enviados automaticamente
 *
 * Refresh silencioso:
 *   1. Request → backend retorna 401
 *   2. Proxy chama /auth/refresh internamente com rtpm_refresh
 *   3. Se sucesso: atualiza rtpm_access cookie e re-tenta a request original
 *   4. Se refresh falhou: limpa cookies e devolve 401 ao cliente (force
 *      relogin)
 *
 * Trade-off: GET com cache=no-store sempre — dados de gestão são
 * sensíveis a stale state. ISR ou cache de pages aqui é desligado.
 */

interface RefreshResponse {
  access_token: string;
  expires_at: string;
}

async function forwardToBackend(
  req: NextRequest,
  pathSegments: string[],
  accessToken: string,
): Promise<{ status: number; body: unknown; rawBody?: string }> {
  // Reconstrói path + query do request original.
  const path = "/api/v1/" + pathSegments.join("/");
  const search = req.nextUrl.search ?? "";

  // Para métodos com corpo, lê como text (preservamos JSON; multipart upload
  // não está em escopo deste MVP).
  const hasBody = !["GET", "HEAD", "DELETE"].includes(req.method);
  const bodyText = hasBody ? await req.text() : undefined;

  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Bearer ${accessToken}`,
  };
  if (bodyText) headers["Content-Type"] = "application/json";

  const url = `${
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    "http://api.realtpmsys.local:8000"
  }${path}${search}`;

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: bodyText,
    cache: "no-store",
  });

  const raw = await res.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  return { status: res.status, body: parsed, rawBody: raw };
}

async function trySilentRefresh(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;
  try {
    const r = await backendFetch<RefreshResponse>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refresh },
    });
    await updateAccessCookie(r.access_token, r.expires_at);
    return r.access_token;
  } catch (err) {
    // Refresh falhou (expirado/invalidado pelo backend) → cliente precisa
    // relogar. Limpa cookies pra UI ficar coerente.
    const e = err as BackendError;
    if (e.status === 401) {
      await clearSessionCookies();
    }
    return null;
  }
}

async function handle(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path: pathSegments } = await ctx.params;

  let accessToken = await getAccessToken();
  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let attempt = await forwardToBackend(req, pathSegments, accessToken);

  // 401 do backend → access token expirou. Tenta refresh silencioso e
  // re-tenta UMA vez. Se ainda falhar, propaga 401 limpando cookies.
  if (attempt.status === 401) {
    const newToken = await trySilentRefresh();
    if (newToken) {
      attempt = await forwardToBackend(req, pathSegments, newToken);
    } else {
      return NextResponse.json(
        { error: "Sessão expirada — faça login novamente" },
        { status: 401 },
      );
    }
  }

  // Response code 204 sem corpo.
  if (attempt.status === 204) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(attempt.body ?? {}, { status: attempt.status });
}

// Mesma função para todos os verbos — Next 15 exige exportar GET/POST/etc.
// separadamente em route handlers.
export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
