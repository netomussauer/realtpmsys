import { NextResponse } from "next/server";
import { isSameOriginRequest } from "@/shared/lib/csrf";
import { z } from "zod";
import { backendFetch, type BackendError } from "@/shared/lib/backend";
import { setSessionCookies } from "@/shared/lib/session";
import type { BackendLoginResponse } from "@/features/auth/types/auth.types";

/**
 * POST /api/auth/login — BFF do login.
 *
 * Fluxo:
 *   1. valida body (Zod)
 *   2. encaminha POST /auth/login pro backend Go
 *   3. grava cookies httpOnly (access + refresh + session metadata)
 *   4. devolve dados mínimos ao client (sem JWT) — só perfil e userId
 *      pra ele decidir pra onde redirecionar
 *
 * Nunca expõe o JWT na response — só nos cookies httpOnly.
 */

const bodySchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "Origem não permitida" }, { status: 403 });
  }

  let parsed;
  try {
    parsed = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json(
      { error: "Payload inválido" },
      { status: 400 },
    );
  }

  let tokens: BackendLoginResponse;
  try {
    tokens = await backendFetch<BackendLoginResponse>("/auth/login", {
      method: "POST",
      body: parsed,
    });
  } catch (err) {
    const e = err as BackendError;
    // 401 = credenciais inválidas; 429 = e-mail bloqueado por tentativas
    // demais (a mensagem do backend já diz para aguardar). Ambos são
    // propagados; qualquer outro erro vira 502.
    const status = e.status === 401 || e.status === 429 ? e.status : 502;
    return NextResponse.json(
      { error: e.message ?? "Falha ao autenticar" },
      { status },
    );
  }

  // Grava cookies. Email vem do form (backend não devolve email no payload).
  await setSessionCookies(tokens, { email: parsed.email });

  return NextResponse.json({
    userId: tokens.user_id,
    perfil: tokens.perfil,
    // Senha temporária: o client leva o usuário direto à troca de senha.
    deveTrocarSenha: tokens.deve_trocar_senha === true,
  });
}
