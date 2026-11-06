import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET, PATCH, POST } from "./route";
import { refreshSession } from "@/shared/lib/refresh";
import {
  clearSessionCookies,
  getAccessToken,
  getRefreshToken,
  updateSessionFromRefresh,
} from "@/shared/lib/session";

vi.mock("@/shared/lib/session");
vi.mock("@/shared/lib/refresh");

const mockedAccess = vi.mocked(getAccessToken);
const mockedRefreshToken = vi.mocked(getRefreshToken);
const mockedRefreshSession = vi.mocked(refreshSession);
const mockedUpdate = vi.mocked(updateSessionFromRefresh);
const mockedClear = vi.mocked(clearSessionCookies);

function req(method: string, path: string, headers: Record<string, string> = {}, body?: string) {
  return new NextRequest(`http://app.realtpmsys.local/api/v1/${path}`, { method, headers, body });
}
const ctx = (segmentos: string[]) => ({ params: Promise.resolve({ path: segmentos }) });

function backendResponde(status: number, corpo: unknown = {}) {
  const fetchMock = vi.fn().mockResolvedValue({
    status,
    text: () => Promise.resolve(JSON.stringify(corpo)),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("proxy /api/v1/[...path]", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe("renovação (N-2: o cookie do access some em 15 min)", () => {
    it("sem access mas com refresh: renova ANTES de responder 401 e usa o access novo", async () => {
      mockedAccess.mockResolvedValue(null);
      mockedRefreshToken.mockResolvedValue("rt");
      mockedRefreshSession.mockResolvedValue({ access_token: "access-novo" } as never);
      const fetchMock = backendResponde(200, { ok: true });

      const res = await GET(req("GET", "atletas"), ctx(["atletas"]));

      expect(res.status).toBe(200);
      expect(mockedUpdate).toHaveBeenCalled();
      const [, init] = fetchMock.mock.calls[0];
      expect(init.headers.Authorization).toBe("Bearer access-novo");
    });

    it("sem access e sem refresh: 401 sem chamar o backend", async () => {
      mockedAccess.mockResolvedValue(null);
      mockedRefreshToken.mockResolvedValue(null);
      const fetchMock = backendResponde(200);

      const res = await GET(req("GET", "atletas"), ctx(["atletas"]));

      expect(res.status).toBe(401);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("sem access e refresh rejeitado (401): limpa cookies e responde 401", async () => {
      mockedAccess.mockResolvedValue(null);
      mockedRefreshToken.mockResolvedValue("rt-morto");
      mockedRefreshSession.mockRejectedValue({ status: 401, message: "revogado" });
      const fetchMock = backendResponde(200);

      const res = await GET(req("GET", "atletas"), ctx(["atletas"]));

      expect(res.status).toBe(401);
      expect(mockedClear).toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("com access, o backend devolve 401 (expirou): renova e repete a chamada uma vez", async () => {
      mockedAccess.mockResolvedValue("access-velho");
      mockedRefreshToken.mockResolvedValue("rt");
      mockedRefreshSession.mockResolvedValue({ access_token: "access-novo" } as never);
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({ status: 401, text: () => Promise.resolve("{}") })
        .mockResolvedValueOnce({ status: 200, text: () => Promise.resolve('{"ok":true}') });
      vi.stubGlobal("fetch", fetchMock);

      const res = await GET(req("GET", "atletas"), ctx(["atletas"]));

      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer access-novo");
    });
  });

  describe("caminho (B-4)", () => {
    it.each([
      ["ponto-ponto", [".."]],
      ["ponto-ponto no meio", ["atletas", "..", "metrics"]],
      ["barra no segmento", ["atletas/../../metrics"]],
      ["segmento vazio", ["atletas", ""]],
      ["query injetada", ["atletas?x=1"]],
    ])("recusa %s com 400 sem chamar o backend", async (_nome, segmentos) => {
      mockedAccess.mockResolvedValue("tok");
      const fetchMock = backendResponde(200);

      const res = await GET(req("GET", "x"), ctx(segmentos));

      expect(res.status).toBe(400);
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe("CSRF (M-5)", () => {
    it("POST de outra origem (Origin de outra porta do mesmo host) é recusado com 403", async () => {
      mockedAccess.mockResolvedValue("tok");
      const fetchMock = backendResponde(200);

      const res = await POST(
        req("POST", "usuarios", { origin: "http://app.realtpmsys.local:3000", host: "app.realtpmsys.local" }, "{}"),
        ctx(["usuarios"]),
      );

      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("PATCH com Sec-Fetch-Site: same-site é recusado", async () => {
      mockedAccess.mockResolvedValue("tok");
      const fetchMock = backendResponde(200);

      const res = await PATCH(
        req("PATCH", "usuarios/1/desativar", { "sec-fetch-site": "same-site" }),
        ctx(["usuarios", "1", "desativar"]),
      );

      expect(res.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("POST da própria origem passa", async () => {
      mockedAccess.mockResolvedValue("tok");
      backendResponde(201, { id: "u1" });

      const res = await POST(
        req("POST", "usuarios", { origin: "http://app.realtpmsys.local", host: "app.realtpmsys.local" }, "{}"),
        ctx(["usuarios"]),
      );

      expect(res.status).toBe(201);
    });

    it("GET nunca é bloqueado pelo CSRF", async () => {
      mockedAccess.mockResolvedValue("tok");
      backendResponde(200);

      const res = await GET(req("GET", "atletas", { "sec-fetch-site": "cross-site" }), ctx(["atletas"]));

      expect(res.status).toBe(200);
    });
  });
});
