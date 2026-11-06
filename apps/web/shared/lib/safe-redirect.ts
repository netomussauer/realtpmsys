/**
 * Valida o destino de um redirecionamento pós-login (`?next=`).
 *
 * Sem isso, `/login?next=https://evil.example` (ou `//evil.example`) levaria o
 * usuário, logo depois de autenticar, para um site externo — phishing com a
 * credibilidade do login legítimo (open redirect).
 *
 * Só são aceitos caminhos internos. A validação é feita sobre o resultado
 * NORMALIZADO, não só sobre a entrada: `/.//evil.example` não começa com `//`,
 * mas a normalização de dot-segments (WHATWG URL) o transforma em
 * `//evil.example`, que o navegador trata como URL protocol-relative.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/dashboard"): string {
  if (!next) return fallback;
  if (!next.startsWith("/")) return fallback;
  // `/\evil.example` é tratado como `//evil.example` por vários navegadores.
  // eslint-disable-next-line no-control-regex
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;

  const base = "http://internal.invalid";
  try {
    const url = new URL(next, base);
    if (url.origin !== base) return fallback;
    const saida = url.pathname + url.search + url.hash;
    // Depois de normalizado, o caminho precisa ser "/" + algo que não comece
    // com outra barra: "//host" seria lido como protocol-relative.
    if (!saida.startsWith("/") || saida.startsWith("//")) return fallback;
    return saida;
  } catch {
    return fallback;
  }
}
