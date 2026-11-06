import { afterEach, describe, expect, it, vi } from "vitest";
import { contaService } from "./conta.service";

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

describe("contaService.list", () => {
  it("faz GET em /api/v1/usuarios sem query string quando o filtro é vazio", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 1, per_page: 20 } });

    await contaService.list();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/usuarios", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("monta a query string (busca, perfil, ativo, page) e ignora campos vazios", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 2, per_page: 20 } });

    await contaService.list({ busca: "ana", perfil: "TREINADOR", ativo: "false", page: 2 });

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/usuarios?");
    expect(url).toContain("busca=ana");
    expect(url).toContain("perfil=TREINADOR");
    expect(url).toContain("ativo=false");
    expect(url).toContain("page=2");
  });
});

describe("contaService.getById", () => {
  it("faz GET em /api/v1/usuarios/{id}", async () => {
    const fetchMock = mockFetchOnce(200, { id: "u1" });
    await contaService.getById("u1");
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/usuarios/u1", expect.anything());
  });

  it("propaga a mensagem do backend (RFC 7807 `detail`) em caso de erro", async () => {
    mockFetchOnce(404, { detail: "entidade não encontrada" });
    await expect(contaService.getById("x")).rejects.toThrow("entidade não encontrada");
  });
});

describe("contaService.criar", () => {
  it("faz POST em /api/v1/usuarios com o corpo e devolve a senha temporária", async () => {
    const fetchMock = mockFetchOnce(201, { id: "u1", senha_temporaria: "Abc123xyz9" });

    const r = await contaService.criar({ email: "a@b.co", nome: "Ana", perfil: "TREINADOR" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/usuarios",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "a@b.co", nome: "Ana", perfil: "TREINADOR" }),
      }),
    );
    expect(r.senha_temporaria).toBe("Abc123xyz9");
  });

  it("propaga o erro de e-mail em uso (409)", async () => {
    mockFetchOnce(409, { detail: "e-mail já está em uso" });
    await expect(contaService.criar({ email: "a@b.co", nome: "", perfil: "ADMIN" })).rejects.toThrow(
      "e-mail já está em uso",
    );
  });
});

describe("contaService.atualizar", () => {
  it("faz PUT em /api/v1/usuarios/{id}", async () => {
    const fetchMock = mockFetchOnce(200, { id: "u1" });
    await contaService.atualizar("u1", { nome: "Ana", perfil: "ADMIN" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/usuarios/u1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ nome: "Ana", perfil: "ADMIN" }) }),
    );
  });
});

describe("contaService.mudarStatus", () => {
  it.each(["ativar", "desativar"] as const)("faz PATCH em /usuarios/{id}/%s", async (acao) => {
    const fetchMock = mockFetchOnce(200, { id: "u1" });
    await contaService.mudarStatus("u1", acao);
    expect(fetchMock).toHaveBeenCalledWith(
      `/api/v1/usuarios/u1/${acao}`,
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("contaService.redefinirSenha", () => {
  it("faz POST em /usuarios/{id}/redefinir-senha e devolve a senha temporária", async () => {
    const fetchMock = mockFetchOnce(200, { id: "u1", senha_temporaria: "Nova123abc" });

    const r = await contaService.redefinirSenha("u1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/usuarios/u1/redefinir-senha",
      expect.objectContaining({ method: "POST" }),
    );
    expect(r.senha_temporaria).toBe("Nova123abc");
  });
});
