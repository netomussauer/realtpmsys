/**
 * Cliente HTTP client-side compartilhado por todas as features — chama o
 * proxy `/api/v1/*` deste Next (NÃO o backend Go diretamente; o proxy
 * injeta o JWT do cookie httpOnly). Extraído de `features/atletas` e
 * `features/turmas`, que tinham cópias idênticas deste helper (achado de
 * code-review: duplicação corre o risco de uma correção futura — ex: novo
 * formato de erro, tratamento de refresh — ser aplicada numa cópia e
 * esquecida na outra).
 *
 * Erros HTTP viram exceções com mensagem do backend (RFC 7807-friendly)
 * — TanStack Query captura pela camada de hooks.
 */
export async function apiClient<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    credentials: "same-origin",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 204) return undefined as T;

  const json = (await res.json().catch(() => ({}))) as {
    error?: string;
    detail?: string;
    title?: string;
  };

  if (!res.ok) {
    const msg = json.detail || json.title || json.error || `Erro ${res.status}`;
    throw new Error(msg);
  }

  return json as T;
}

/** Monta query string a partir de um objeto de filtro (ignora chaves vazias/undefined). */
export function toQueryString(filter: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filter)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const s = params.toString();
  return s ? `?${s}` : "";
}
