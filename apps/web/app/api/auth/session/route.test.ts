import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { refreshSession } from "@/shared/lib/refresh";
import {
  clearSessionCookies,
  getRefreshToken,
  getVerifiedSession,
  updateSessionFromRefresh,
} from "@/shared/lib/session";

vi.mock("@/shared/lib/session");
vi.mock("@/shared/lib/refresh");

const mockedVerified = vi.mocked(getVerifiedSession);
const mockedGetRefresh = vi.mocked(getRefreshToken);
const mockedRefreshSession = vi.mocked(refreshSession);
const mockedUpdate = vi.mocked(updateSessionFromRefresh);
const mockedClear = vi.mocked(clearSessionCookies);

const sessao = {
  userId: "u1",
  email: "ana@example.com",
  perfil: "ADMIN" as const,
  accessExpiresAt: "2026-01-01T00:15:00Z",
};

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("access válido: devolve a sessão sem tocar no refresh", async () => {
    mockedVerified.mockResolvedValue(sessao);

    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ session: sessao });
    expect(mockedRefreshSession).not.toHaveBeenCalled();
  });

  it("sem access nem refresh: 401 e nada é renovado", async () => {
    mockedVerified.mockResolvedValue(null);
    mockedGetRefresh.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ session: null });
    expect(mockedRefreshSession).not.toHaveBeenCalled();
  });

  it("access expirado MAS refresh válido: renova, regrava os cookies e devolve a sessão nova", async () => {
    mockedVerified.mockResolvedValue(null);
    mockedGetRefresh.mockResolvedValue("rt-antigo");
    const tokens = { access_token: "novo" } as never;
    mockedRefreshSession.mockResolvedValue(tokens);
    mockedUpdate.mockResolvedValue(sessao);

    const res = await GET();

    expect(mockedRefreshSession).toHaveBeenCalledWith("rt-antigo");
    expect(mockedUpdate).toHaveBeenCalledWith(tokens);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ session: sessao });
  });

  it("refresh rejeitado pelo backend (401): sessão acabou, limpa os cookies", async () => {
    mockedVerified.mockResolvedValue(null);
    mockedGetRefresh.mockResolvedValue("rt-revogado");
    mockedRefreshSession.mockRejectedValue({ status: 401, message: "inválido" });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(mockedClear).toHaveBeenCalledTimes(1);
  });

  it("backend indisponível (não-401): 401 para o client, mas NÃO apaga os cookies", async () => {
    mockedVerified.mockResolvedValue(null);
    mockedGetRefresh.mockResolvedValue("rt-ok");
    mockedRefreshSession.mockRejectedValue({ status: 502, message: "fora do ar" });

    const res = await GET();

    expect(res.status).toBe(401);
    expect(mockedClear).not.toHaveBeenCalled();
  });
});
