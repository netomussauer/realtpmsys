import { NextResponse } from "next/server";
import type { BackendError } from "@/shared/lib/backend";
import { refreshSession } from "@/shared/lib/refresh";
import {
  clearSessionCookies,
  getRefreshToken,
  getVerifiedSession,
  updateSessionFromRefresh,
} from "@/shared/lib/session";

/**
 * GET /api/auth/session — devolve a sessão atual ao client.
 *
 * Usa `getVerifiedSession` (com `jwtVerify`) — garante que:
 *   - o cookie session JSON não foi forjado via DevTools
 *   - o JWT access ainda está vinculado ao mesmo user_id/perfil
 *   - a assinatura HMAC bate com JWT_SECRET
 *
 * O access token dura 15 min e o cookie dele some do navegador ao expirar;
 * o refresh dura dias. Se o access não valida mas há refresh, esta rota
 * RENOVA a sessão (único lugar onde, sem uma chamada de API, conseguimos
 * regravar cookies) e devolve a sessão nova — sem isso, `useSession()` veria
 * "deslogado" a cada 15 min e as telas negariam acesso por engano.
 *
 * Retorna 401 quando não há sessão recuperável; o hook `useSession()` no
 * client interpreta isso como "deslogado". Sem corpo de erro detalhado — não
 * vaza info útil pro atacante.
 */
export async function GET() {
  const session = await getVerifiedSession();
  if (session) {
    return NextResponse.json({ session });
  }

  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ session: null }, { status: 401 });
  }

  try {
    const tokens = await refreshSession(refreshToken);
    const renovada = await updateSessionFromRefresh(tokens);
    return NextResponse.json({ session: renovada });
  } catch (err) {
    // 401 do backend = refresh inválido/revogado/reusado: a sessão acabou de
    // verdade. Qualquer outro erro (backend fora) é transitório — não apaga
    // os cookies, para o usuário não perder a sessão por uma indisponibilidade.
    if ((err as BackendError).status === 401) {
      await clearSessionCookies();
    }
    return NextResponse.json({ session: null }, { status: 401 });
  }
}
