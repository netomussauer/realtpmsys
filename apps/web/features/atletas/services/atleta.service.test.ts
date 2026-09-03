import { afterEach, describe, expect, it, vi } from "vitest";
import { atletaService } from "./atleta.service";

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

describe("atletaService.list", () => {
  it("faz GET em /atletas sem query string quando o filtro está vazio", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 1, per_page: 20 } });

    await atletaService.list();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/atletas",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("monta a query string a partir do filtro (nome, status, page)", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 2, per_page: 20 } });

    await atletaService.list({ nome: "João", status: "ATIVO", page: 2 });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/api/v1/atletas?");
    expect(url).toContain("nome=Jo%C3%A3o");
    expect(url).toContain("status=ATIVO");
    expect(url).toContain("page=2");
  });

  it("devolve a lista e a paginação da resposta", async () => {
    const payload = { data: [{ id: "a1" }], pagination: { total: 1, page: 1, per_page: 20 } };
    mockFetchOnce(200, payload);

    const result = await atletaService.list();

    expect(result).toEqual(payload);
  });

  it("lança o erro do backend quando a resposta não é ok", async () => {
    mockFetchOnce(403, { detail: "Acesso negado" });

    await expect(atletaService.list()).rejects.toThrow("Acesso negado");
  });
});

describe("atletaService.getById", () => {
  it("faz GET em /atletas/{id}", async () => {
    const fetchMock = mockFetchOnce(200, { id: "a1", nome: "João" });

    await atletaService.getById("a1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/atletas/a1",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("lança erro genérico com o status quando o corpo não tem detail/title/error", async () => {
    mockFetchOnce(404, {});

    await expect(atletaService.getById("inexistente")).rejects.toThrow("Erro 404");
  });
});

describe("atletaService.cadastrar", () => {
  it("faz POST em /atletas com o corpo serializado", async () => {
    const fetchMock = mockFetchOnce(201, { id: "a1", nome: "João" });
    const data = { nome: "João da Silva", data_nascimento: "2010-05-20" };

    await atletaService.cadastrar(data as never);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/atletas",
      expect.objectContaining({ method: "POST", body: JSON.stringify(data) }),
    );
  });

  it("lança o erro de validação do backend", async () => {
    mockFetchOnce(422, { detail: "CPF já cadastrado" });

    await expect(
      atletaService.cadastrar({ nome: "João", data_nascimento: "2010-05-20" } as never),
    ).rejects.toThrow("CPF já cadastrado");
  });
});

describe("atletaService.atualizar", () => {
  it("faz PUT em /atletas/{id} com o corpo serializado", async () => {
    const fetchMock = mockFetchOnce(200, { id: "a1", nome: "João Editado" });
    const data = { nome: "João Editado", data_nascimento: "2010-05-20" };

    await atletaService.atualizar("a1", data as never);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/atletas/a1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(data) }),
    );
  });
});

describe("atletaService.mudarStatus", () => {
  it("faz PATCH em /atletas/{id}/{acao}", async () => {
    const fetchMock = mockFetchOnce(200, { id: "a1", status: "SUSPENSO" });

    await atletaService.mudarStatus("a1", "suspender");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/atletas/a1/suspender",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});

describe("atletaService.remover", () => {
  it("faz DELETE em /atletas/{id} e não tenta ler o corpo em 204", async () => {
    const jsonSpy = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 204, json: jsonSpy });
    vi.stubGlobal("fetch", fetchMock);

    const result = await atletaService.remover("a1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/atletas/a1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(result).toBeUndefined();
  });
});

describe("atletaService.listResponsaveis", () => {
  it("faz GET em /atletas/{id}/responsaveis", async () => {
    const payload = { data: [{ id: "r1", nome: "Maria" }] };
    const fetchMock = mockFetchOnce(200, payload);

    const result = await atletaService.listResponsaveis("a1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/atletas/a1/responsaveis",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result).toEqual(payload);
  });
});

describe("atletaService.adicionarResponsavel", () => {
  it("faz POST em /atletas/{id}/responsaveis com o corpo serializado", async () => {
    const fetchMock = mockFetchOnce(201, { id: "r1" });
    const data = { nome: "Maria", telefone: "21999999999", parentesco: "MAE" as const, contato_principal: true };

    await atletaService.adicionarResponsavel("a1", data);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/atletas/a1/responsaveis",
      expect.objectContaining({ method: "POST", body: JSON.stringify(data) }),
    );
  });
});

describe("atletaService.getUniforme", () => {
  it("devolve o uniforme quando a resposta é ok", async () => {
    const uniforme = { id: "u1", atleta_id: "a1", tam_camisa: "M", tam_short: "P", tam_chuteira: "38" };
    mockFetchOnce(200, uniforme);

    const result = await atletaService.getUniforme("a1");

    expect(result).toEqual(uniforme);
  });

  it("devolve null quando o backend responde 404 (sem detail/title/error)", async () => {
    mockFetchOnce(404, {});

    const result = await atletaService.getUniforme("a1");

    expect(result).toBeNull();
  });

  it("propaga o erro quando a falha não é 404", async () => {
    mockFetchOnce(500, { detail: "Erro interno" });

    await expect(atletaService.getUniforme("a1")).rejects.toThrow("Erro interno");
  });
});

describe("atletaService.setUniforme", () => {
  it("faz PUT em /atletas/{id}/uniforme com o corpo serializado", async () => {
    const fetchMock = mockFetchOnce(200, { id: "u1" });
    const data = { tam_camisa: "M" as const, tam_short: "P" as const, tam_chuteira: "38" };

    await atletaService.setUniforme("a1", data);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/atletas/a1/uniforme",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(data) }),
    );
  });
});
