import { NextResponse } from "next/server";
import type { BackendError } from "@/shared/lib/backend";
import { refreshSession } from "@/shared/lib/refresh";
import {
  getRefreshToken,
  updateSessionFromRefresh,
  clearSessionCookies,
} from "@/shared/lib/session";

/**
 * POST /api/auth/refresh — usa o cookie refresh_token pra renovar a sessão.
 *
 * O refresh é rotativo: a resposta do backend traz um refresh token novo e
 * `updateSessionFromRefresh` regrava os três cookies (access, refresh,
 * session). Renovações concorrentes são unificadas por `refreshSession`.
 *
 * Chamado:
 *   - automaticamente pelo proxy de API quando recebe 401
 *   - pelo fluxo de troca de senha, para emitir um access sem a trava de
 *     senha temporária
 *
 * Se o backend rejeitar (refresh expirado/revogado/reusado), limpa todos os
 * cookies — força o usuário a relogar. Não tenta recuperar.
 */
export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ error: "Sem refresh token" }, { status: 401 });
  }

  try {
    const tokens = await refreshSession(refreshToken);
    await updateSessionFromRefresh(tokens);
    return NextResponse.json({
      ok: true,
      expiresAt: tokens.expires_at,
      deveTrocarSenha: tokens.deve_trocar_senha === true,
    });
  } catch (err) {
    const e = err as BackendError;
    // 401 do backend = refresh inválido. Limpa cookies pra reforçar o estado.
    if (e.status === 401) {
      await clearSessionCookies();
    }
    return NextResponse.json(
      { error: e.message ?? "Falha ao renovar sessão" },
      { status: e.status ?? 502 },
    );
  }
}
