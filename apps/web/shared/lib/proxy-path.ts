/**
 * Valida os segmentos de caminho do proxy `/api/v1/[...path]` antes de
 * montá-los na URL do backend.
 *
 * O Next entrega os segmentos já decodificados; sem filtro, `%2F..%2F` ou
 * `..` chegariam ao `fetch` e, após a normalização da URL, poderiam alcançar
 * rotas fora de `/api/v1` do backend (ex.: `/metrics`) usando o token do
 * usuário. O proxy só deve falar com `/api/v1/*`.
 */

// eslint-disable-next-line no-control-regex
const PROIBIDO = /[/\\?#%\u0000-\u001f\u007f]/;

export function isSafePathSegments(segments: readonly string[]): boolean {
  if (segments.length === 0) return false;
  return segments.every((s) => s !== "" && s !== "." && s !== ".." && !PROIBIDO.test(s));
}
