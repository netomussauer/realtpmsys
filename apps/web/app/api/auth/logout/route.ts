import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/shared/lib/csrf";
import { backendFetch } from "@/shared/lib/backend";
import { clearSessionCookies, getRefreshToken } from "@/shared/lib/session";

/**
 * POST /api/auth/logout — encerra a sessão.
 *
 * O refresh token vive no banco do backend (revogável), então o logout
 * primeiro o revoga lá (`POST /auth/logout`, derruba a família inteira) e só
 * então limpa os cookies do navegador. A revogação é *best effort*: se o
 * backend estiver fora, os cookies são limpos mesmo assim — o usuário sai
 * deste navegador de qualquer forma, e o refresh token expira por conta própria.
 *
 * O access token continua válido até expirar (JWT stateless; TTL curto), mas
 * sem o cookie o navegador nunca mais o envia.
 */
export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    try {
      await backendFetch("/auth/logout", {
        method: "POST",
        body: { refresh_token: refreshToken },
      });
    } catch {
      // Ignorado de propósito — ver comentário acima.
    }
  }
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
