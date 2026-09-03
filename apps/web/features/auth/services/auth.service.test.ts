import { afterEach, describe, expect, it, vi } from "vitest";
import { authService } from "./auth.service";

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("authService.login", () => {
  it("faz POST em /api/auth/login e devolve userId + perfil", async () => {
    const fetchMock = mockFetchOnce(200, { userId: "u1", perfil: "ADMIN" });

    const result = await authService.login({ email: "joao@realtpm.app", senha: "senha123" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/login",
      expect.objectContaining({
        method: "POST",
        credentials: "same-origin",
        body: JSON.stringify({ email: "joao@realtpm.app", senha: "senha123" }),
      }),
    );
    expect(result).toEqual({ userId: "u1", perfil: "ADMIN" });
  });

  it("lança o erro retornado pelo BFF quando a resposta não é ok", async () => {
    mockFetchOnce(401, { error: "credenciais inválidas" });

    await expect(
      authService.login({ email: "joao@realtpm.app", senha: "errada" }),
    ).rejects.toThrow("credenciais inválidas");
  });

  it("lança um erro genérico com o status HTTP quando o corpo não tem `error`", async () => {
    mockFetchOnce(500, {});

    await expect(
      authService.login({ email: "joao@realtpm.app", senha: "x" }),
    ).rejects.toThrow("Falha ao autenticar (HTTP 500)");
  });

  it("lança o erro genérico quando o corpo da resposta não é JSON válido", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      json: () => Promise.reject(new Error("not json")),
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      authService.login({ email: "joao@realtpm.app", senha: "x" }),
    ).rejects.toThrow("Falha ao autenticar (HTTP 502)");
  });
});

describe("authService.logout", () => {
  it("faz POST em /api/auth/logout", async () => {
    const fetchMock = mockFetchOnce(200, {});

    await authService.logout();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/logout",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });
});

describe("authService.session", () => {
  it("devolve a sessão quando a resposta é 200", async () => {
    const session = { userId: "u1", email: "joao@realtpm.app", perfil: "ADMIN", accessExpiresAt: "2026-01-01T00:00:00Z" };
    mockFetchOnce(200, { session });

    const result = await authService.session();

    expect(result).toEqual(session);
  });

  it("devolve null quando a resposta é 401 (sem sessão), sem tentar ler o corpo", async () => {
    const jsonSpy = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401, json: jsonSpy });
    vi.stubGlobal("fetch", fetchMock);

    const result = await authService.session();

    expect(result).toBeNull();
    expect(jsonSpy).not.toHaveBeenCalled();
  });
});

describe("authService.refresh", () => {
  it("devolve true quando a resposta é ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await authService.refresh();

    expect(result).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/auth/refresh",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    );
  });

  it("devolve false quando a resposta não é ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);

    const result = await authService.refresh();

    expect(result).toBe(false);
  });
});
