import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/shared/lib/csrf";
import { z } from "zod";
import { backendFetch, type BackendError } from "@/shared/lib/backend";
import { refreshSession } from "@/shared/lib/refresh";
import {
  getAccessToken,
  getRefreshToken,
  updateSessionFromRefresh,
} from "@/shared/lib/session";

/**
 * POST /api/auth/senha — troca da PRÓPRIA senha (qualquer perfil).
 *
 * Por que não passa pelo proxy genérico `/api/v1/*`: o backend precisa do
 * refresh token da sessão atual (para poupá-la ao revogar as demais), e esse
 * token está num cookie httpOnly que o JavaScript do navegador não lê. Só o
 * BFF o enxerga.
 *
 * Fluxo:
 *   1. PATCH /api/v1/me/senha no backend, com access token + refresh token
 *   2. renova a sessão (o refresh é rotativo e o novo access sai SEM a trava
 *      de senha temporária) e regrava os cookies
 *
 * Os erros do backend (senha atual incorreta, senha fraca...) voltam com a
 * mensagem em português para o formulário exibir.
 */

const bodySchema = z.object({
  senhaAtual: z.string().min(1),
  novaSenha: z.string().min(1),
});

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const accessToken = await getAccessToken();
  const refreshToken = await getRefreshToken();
  if (!accessToken || !refreshToken) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  try {
    await backendFetch("/api/v1/me/senha", {
      method: "PATCH",
      accessToken,
      body: {
        senha_atual: parsed.senhaAtual,
        nova_senha: parsed.novaSenha,
        refresh_token: refreshToken,
      },
    });
  } catch (err) {
    const e = err as BackendError;
    return NextResponse.json(
      { error: e.message ?? "Falha ao trocar a senha" },
      { status: e.status ?? 502 },
    );
  }

  // A senha já foi trocada. Se a renovação falhar, o usuário só precisará
  // entrar de novo — não é motivo para reportar erro na troca em si.
  try {
    const tokens = await refreshSession(refreshToken);
    await updateSessionFromRefresh(tokens);
  } catch {
    return NextResponse.json({ ok: true, sessaoRenovada: false });
  }
  return NextResponse.json({ ok: true, sessaoRenovada: true });
}
