/**
 * Valida o destino de um redirecionamento pós-login (`?next=`).
 *
 * Sem isso, `/login?next=https://evil.example` (ou `//evil.example`) levaria o
 * usuário, logo depois de autenticar, para um site externo — phishing com a
 * credibilidade do login legítimo (open redirect).
 *
 * Só são aceitos caminhos internos: começam com uma única `/`, não contêm
 * barra invertida nem caracteres de controle, e resolvidos contra uma origem
 * fictícia continuam nela. Qualquer outra coisa cai no `fallback`.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/") || next.startsWith("//")) return fallback;
  // `/\evil.example` é tratado como `//evil.example` por vários navegadores.
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;

  const base = "http://internal.invalid";
  try {
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}
