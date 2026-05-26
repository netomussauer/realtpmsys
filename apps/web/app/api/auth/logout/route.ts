import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/shared/lib/session";

/**
 * POST /api/auth/logout — limpa cookies do navegador.
 *
 * Backend Go é stateless (não há sessão server-side), então não chama
 * o backend. Limpar os cookies do browser é suficiente — qualquer
 * requisição subsequente sem `rtpm_access` vai falhar no `Auth`
 * middleware do backend. O JWT continua valido até expirar
 * (trade-off documentado em ADR-008 do backend), mas sem o cookie o
 * browser nunca mais o envia.
 */
export async function POST() {
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
