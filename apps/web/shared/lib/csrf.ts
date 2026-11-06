/**
 * Proteção CSRF dos route handlers do BFF que mudam estado.
 *
 * `sameSite=lax` sozinho não basta: o navegador trata como "mesmo site" tudo
 * que compartilha o host, ignorando a PORTA. No lab, qualquer outro serviço no
 * mesmo host (Gitea, Harbor…) é "same-site" e os cookies viajam em requisições
 * disparadas por ele. O proxy `/api/v1/*` aceita `text/plain` e repassa o
 * corpo, então uma página dessas poderia fazer um POST/PATCH autenticado "às
 * cegas" (a resposta não seria legível, mas o efeito aconteceria).
 *
 * Defesa: toda requisição que muda estado precisa ter vindo da própria origem.
 *   1. `Sec-Fetch-Site` (enviado por todos os navegadores atuais, não
 *      forjável por JavaScript): aceita só `same-origin` ou `none` (ação do
 *      usuário, ex.: digitou a URL).
 *   2. Sem ele, cai no cabeçalho `Origin`: o host precisa ser o do próprio
 *      servidor. `Origin: null` é recusado.
 *   3. Sem nenhum dos dois não é uma requisição de navegador entre sites (um
 *      atacante via navegador sempre envia ao menos um) — é cliente
 *      não-navegador (curl, testes), que não carrega os cookies da vítima.
 */

const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);

interface RequisicaoMinima {
  method: string;
  headers: Headers;
}

export function isSameOriginRequest(req: RequisicaoMinima): boolean {
  if (METODOS_SEGUROS.has(req.method.toUpperCase())) return true;

  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite !== null) {
    return fetchSite === "same-origin" || fetchSite === "none";
  }

  const origin = req.headers.get("origin");
  if (origin !== null) {
    if (origin === "null") return false;
    const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
    if (!host) return false;
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  return true;
}
