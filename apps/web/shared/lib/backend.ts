/**
 * Cliente HTTP server-side para o backend Go.
 *
 * USADO APENAS por BFF route handlers (server runtime). NÃO importar de
 * componentes client (vazaria a URL interna do cluster). Componentes
 * client devem chamar os route handlers do `/api/...` deste app.
 *
 * NEXT_PUBLIC_API_URL é a URL externa (visível ao client) — mas no
 * runtime do servidor podemos optar por uma URL interna mais rápida
 * (DNS do cluster, `http://realtpmsys-api.realtpmsys.svc.cluster.local:8000`).
 * INTERNAL_API_URL serve esse caso; cai pro PUBLIC se ausente.
 */

const INTERNAL_API_URL =
  process.env.INTERNAL_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  "http://api.realtpmsys.local:8000";

export interface BackendError {
  status: number;
  message: string;
  detail?: string;
}

interface BackendRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  accessToken?: string;
}

/**
 * Wrapper minimalista do fetch para chamar o backend Go.
 *
 * - Stringify automático de body
 * - Bearer auth opcional
 * - cache: 'no-store' por padrão (dados de gestão mudam, sem ISR aqui)
 * - Erros HTTP viram BackendError com mensagem do servidor quando disponível
 */
export async function backendFetch<T = unknown>(
  path: string,
  options: BackendRequestOptions = {},
): Promise<T> {
  const { body, accessToken, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    Accept: "application/json",
    ...((headers as Record<string, string>) ?? {}),
  };
  if (body !== undefined) finalHeaders["Content-Type"] = "application/json";
  if (accessToken) finalHeaders["Authorization"] = `Bearer ${accessToken}`;

  const res = await fetch(`${INTERNAL_API_URL}${path}`, {
    cache: "no-store",
    ...rest,
    headers: finalHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 no-content é resposta válida sem corpo
  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const parsed = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const message =
      (parsed as { detail?: string; error?: string } | null)?.detail ||
      (parsed as { error?: string } | null)?.error ||
      `Erro ${res.status}`;
    throw {
      status: res.status,
      message,
      detail: text,
    } satisfies BackendError;
  }

  return parsed as T;
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
