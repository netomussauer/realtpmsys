import { beforeEach, describe, expect, it, vi } from "vitest";
import { backendFetch } from "@/shared/lib/backend";
import { refreshSession } from "./refresh";

vi.mock("@/shared/lib/backend");

const mockedBackendFetch = vi.mocked(backendFetch);

const resposta = (n: number) => ({
  access_token: `access-${n}`,
  refresh_token: `refresh-${n}`,
  token_type: "Bearer",
  expires_at: "2026-01-01T01:00:00Z",
  refresh_expires_at: "2026-01-08T00:00:00Z",
  user_id: "u1",
  perfil: "ADMIN" as const,
});

describe("refreshSession (single-flight)", () => {
  beforeEach(() => {
    mockedBackendFetch.mockReset();
  });

  it("chama POST /auth/refresh com o refresh token", async () => {
    mockedBackendFetch.mockResolvedValue(resposta(1));

    const r = await refreshSession("rt-a");

    expect(mockedBackendFetch).toHaveBeenCalledWith("/auth/refresh", {
      method: "POST",
      body: { refresh_token: "rt-a" },
    });
    expect(r.refresh_token).toBe("refresh-1");
  });

  it("renovações concorrentes do MESMO token compartilham uma única chamada ao backend", async () => {
    let resolver: (v: ReturnType<typeof resposta>) => void = () => {};
    mockedBackendFetch.mockReturnValue(new Promise((res) => (resolver = res)));

    const [a, b, c] = [refreshSession("rt-a"), refreshSession("rt-a"), refreshSession("rt-a")];
    resolver(resposta(1));

    expect(await a).toBe(await b);
    expect(await b).toBe(await c);
    expect(mockedBackendFetch).toHaveBeenCalledTimes(1);
  });

  it("tokens diferentes não se misturam", async () => {
    mockedBackendFetch.mockResolvedValueOnce(resposta(1)).mockResolvedValueOnce(resposta(2));

    const [a, b] = await Promise.all([refreshSession("rt-a"), refreshSession("rt-b")]);

    expect(mockedBackendFetch).toHaveBeenCalledTimes(2);
    expect(a.access_token).toBe("access-1");
    expect(b.access_token).toBe("access-2");
  });

  it("libera a chave ao terminar: uma renovação posterior faz nova chamada", async () => {
    mockedBackendFetch.mockResolvedValueOnce(resposta(1)).mockResolvedValueOnce(resposta(2));

    await refreshSession("rt-a");
    const segunda = await refreshSession("rt-a");

    expect(mockedBackendFetch).toHaveBeenCalledTimes(2);
    expect(segunda.access_token).toBe("access-2");
  });

  it("propaga a falha a todos os concorrentes e libera a chave para nova tentativa", async () => {
    const erro = { status: 401, message: "inválido" };
    mockedBackendFetch.mockRejectedValueOnce(erro).mockResolvedValueOnce(resposta(2));

    const [a, b] = await Promise.allSettled([refreshSession("rt-a"), refreshSession("rt-a")]);
    expect(a).toEqual({ status: "rejected", reason: erro });
    expect(b).toEqual({ status: "rejected", reason: erro });
    expect(mockedBackendFetch).toHaveBeenCalledTimes(1);

    const depois = await refreshSession("rt-a");
    expect(depois.access_token).toBe("access-2");
  });
});
