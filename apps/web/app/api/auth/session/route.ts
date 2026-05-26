import { NextResponse } from "next/server";
import { getVerifiedSession } from "@/shared/lib/session";

/**
 * GET /api/auth/session — devolve a sessão atual ao client.
 *
 * Usa `getVerifiedSession` (com `jwtVerify`) — garante que:
 *   - o cookie session JSON não foi forjado via DevTools
 *   - o JWT access ainda está vinculado ao mesmo user_id/perfil
 *   - a assinatura HMAC bate com JWT_SECRET
 *
 * Retorna 401 quando não há sessão válida; o hook `useSession()` no
 * client interpreta isso como "deslogado" e dispara redirect quando
 * apropriado. Sem corpo de erro detalhado — não vaza info útil pro atacante.
 */
export async function GET() {
  const session = await getVerifiedSession();
  if (!session) {
    return NextResponse.json({ session: null }, { status: 401 });
  }
  return NextResponse.json({ session });
}
