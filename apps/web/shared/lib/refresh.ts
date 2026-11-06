/**
 * Renovação de sessão no BFF (server-side).
 *
 * O refresh token do backend é rotativo e de uso único. Uma tela como o
 * dashboard dispara várias chamadas ao proxy `/api/v1/*` em paralelo; quando
 * o access token expira, TODAS recebem 401 ao mesmo tempo e cada uma tentaria
 * renovar com o MESMO refresh token — a primeira consome, as demais
 * reapresentam um token já gasto (e uma delas chegaria a apagar os cookies
 * recém-gravados pela vencedora).
 *
 * `refreshSession` faz *single-flight*: renovações concorrentes do mesmo
 * refresh token compartilham uma única chamada ao backend. Vale por processo
 * Node — o Deployment do web roda com 1 réplica. Com mais réplicas, a janela
 * de tolerância do backend (reuso em até 10s só recusa, não revoga a
 * família) cobre a corrida residual.
 */

import { backendFetch } from "@/shared/lib/backend";
import type { BackendRefreshResponse } from "@/features/auth/types/auth.types";

const emVoo = new Map<string, Promise<BackendRefreshResponse>>();

export function refreshSession(refreshToken: string): Promise<BackendRefreshResponse> {
  const existente = emVoo.get(refreshToken);
  if (existente) return existente;

  const p = backendFetch<BackendRefreshResponse>("/auth/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  }).finally(() => {
    emVoo.delete(refreshToken);
  });
  emVoo.set(refreshToken, p);
  return p;
}
