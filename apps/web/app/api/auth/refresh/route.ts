import { NextResponse } from "next/server";
import { backendFetch, type BackendError } from "@/shared/lib/backend";
import {
  getRefreshToken,
  updateAccessCookie,
  clearSessionCookies,
} from "@/shared/lib/session";

interface BackendRefreshResponse {
  access_token: string;
  token_type: string;
  expires_at: string;
  user_id: string;
  perfil: "ADMIN" | "TREINADOR" | "RESPONSAVEL";
}

/**
 * POST /api/auth/refresh — usa o cookie refresh_token pra emitir novo access.
 *
 * Chamado:
 *   - automaticamente pelo proxy de API quando recebe 401 (Fase 4)
 *   - manualmente pelo hook useSession quando descobre access expirado
 *
 * Se o backend rejeitar (refresh expirado/inválido), limpa todos os cookies
 * — força o usuário a relogar. Não tenta recuperar.
 */
export async function POST() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) {
    return NextResponse.json({ error: "Sem refresh token" }, { status: 401 });
  }

  let tokens: BackendRefreshResponse;
  try {
    tokens = await backendFetch<BackendRefreshResponse>("/auth/refresh", {
      method: "POST",
      body: { refresh_token: refreshToken },
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

  await updateAccessCookie(tokens.access_token, tokens.expires_at);

  return NextResponse.json({ ok: true, expiresAt: tokens.expires_at });
}
