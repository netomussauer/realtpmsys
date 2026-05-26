import { NextResponse } from "next/server";
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
    // Backend retorna 401 para credenciais inválidas — propaga limpo.
    const status = e.status === 401 ? 401 : 502;
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
  });
}
