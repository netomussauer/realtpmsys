import { afterEach, describe, expect, it, vi } from "vitest";
import { turmaService, listTreinadores, listCampos } from "./turma.service";
import type { TurmaFormData } from "@/features/turmas/schemas/turma.schema";
import type { MatriculaFormData } from "@/features/turmas/schemas/matricula.schema";

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

const turmaPayload: TurmaFormData = {
  nome: "Sub-13 Manhã",
  faixa_etaria_min: 10,
  faixa_etaria_max: 13,
  capacidade_max: 20,
  horarios: [],
};

describe("turmaService.list", () => {
  it("faz GET em /api/v1/turmas sem query string quando o filtro é vazio", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 1, per_page: 20 } });

    await turmaService.list();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/turmas", expect.objectContaining({ credentials: "same-origin" }));
  });

  it("monta a query string a partir do filtro (nome, status, page)", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 2, per_page: 20 } });

    await turmaService.list({ nome: "Sub-13", status: "ATIVA", page: 2 });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/api/v1/turmas?");
    expect(calledUrl).toContain("nome=Sub-13");
    expect(calledUrl).toContain("status=ATIVA");
    expect(calledUrl).toContain("page=2");
  });

  it("lança o erro do backend quando a resposta não é ok", async () => {
    mockFetchOnce(500, { detail: "erro interno" });

    await expect(turmaService.list()).rejects.toThrow("erro interno");
  });
});

describe("turmaService.getById", () => {
  it("faz GET em /api/v1/turmas/{id} e devolve a turma", async () => {
    const turma = { id: "t1", nome: "Sub-13" };
    const fetchMock = mockFetchOnce(200, turma);

    const result = await turmaService.getById("t1");

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/turmas/t1", expect.objectContaining({ credentials: "same-origin" }));
    expect(result).toEqual(turma);
  });
});

describe("turmaService.criar", () => {
  it("faz POST em /api/v1/turmas com o payload serializado", async () => {
    const turmaCriada = { id: "t1", ...turmaPayload };
    const fetchMock = mockFetchOnce(201, turmaCriada);

    const result = await turmaService.criar(turmaPayload);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/turmas",
      expect.objectContaining({ method: "POST", body: JSON.stringify(turmaPayload) }),
    );
    expect(result).toEqual(turmaCriada);
  });

  it("lança o erro do backend em caso de falha de validação (422)", async () => {
    mockFetchOnce(422, { detail: "faixa etária inválida" });

    await expect(turmaService.criar(turmaPayload)).rejects.toThrow("faixa etária inválida");
  });
});

describe("turmaService.atualizar", () => {
  it("faz PUT em /api/v1/turmas/{id} com o payload serializado", async () => {
    const turmaAtualizada = { id: "t1", ...turmaPayload };
    const fetchMock = mockFetchOnce(200, turmaAtualizada);

    const result = await turmaService.atualizar("t1", turmaPayload);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/turmas/t1",
      expect.objectContaining({ method: "PUT", body: JSON.stringify(turmaPayload) }),
    );
    expect(result).toEqual(turmaAtualizada);
  });
});

describe("turmaService.mudarStatus", () => {
  it("faz PATCH em /api/v1/turmas/{id}/{acao}", async () => {
    const turmaAtualizada = { id: "t1", status: "SUSPENSA" };
    const fetchMock = mockFetchOnce(200, turmaAtualizada);

    const result = await turmaService.mudarStatus("t1", "suspender");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/turmas/t1/suspender",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(result).toEqual(turmaAtualizada);
  });

  it("lança erro quando a transição de status não é permitida (409)", async () => {
    mockFetchOnce(409, { detail: "transição de status inválida" });

    await expect(turmaService.mudarStatus("t1", "reativar")).rejects.toThrow("transição de status inválida");
  });
});

describe("turmaService.listMatriculas", () => {
  it("faz GET em /api/v1/turmas/{turmaId}/matriculas com filtro na query string", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 1, per_page: 20 } });

    await turmaService.listMatriculas("t1", { status: "ATIVA" });

    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe("/api/v1/turmas/t1/matriculas?status=ATIVA");
  });
});

describe("turmaService.matricular", () => {
  it("faz POST em /api/v1/turmas/{turmaId}/matriculas com o payload serializado", async () => {
    const payload: MatriculaFormData = { atleta_id: "a1", data_inicio: "2026-01-01" };
    const matriculaCriada = { id: "m1", turma_id: "t1", ...payload, status: "ATIVA" };
    const fetchMock = mockFetchOnce(201, matriculaCriada);

    const result = await turmaService.matricular("t1", payload);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/turmas/t1/matriculas",
      expect.objectContaining({ method: "POST", body: JSON.stringify(payload) }),
    );
    expect(result).toEqual(matriculaCriada);
  });

  it("lança erro quando a turma está sem vagas (capacidade excedida)", async () => {
    mockFetchOnce(422, { detail: "turma sem vagas disponíveis" });

    await expect(
      turmaService.matricular("t1", { atleta_id: "a1", data_inicio: "2026-01-01" }),
    ).rejects.toThrow("turma sem vagas disponíveis");
  });
});

describe("turmaService.cancelarMatricula", () => {
  it("faz PATCH em /api/v1/matriculas/{matriculaId}/cancelar (NÃO é sub-rota de turma)", async () => {
    const matriculaCancelada = { id: "m1", status: "CANCELADA" };
    const fetchMock = mockFetchOnce(200, matriculaCancelada);

    const result = await turmaService.cancelarMatricula("m1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/matriculas/m1/cancelar",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(result).toEqual(matriculaCancelada);
  });
});

describe("listTreinadores", () => {
  it("faz GET em /api/v1/treinadores com filtro de paginação", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 1, per_page: 100 } });

    await listTreinadores({ per_page: 100 });

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/treinadores?per_page=100", expect.objectContaining({ credentials: "same-origin" }));
  });
});

describe("listCampos", () => {
  it("faz GET em /api/v1/campos com filtro de paginação", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 1, per_page: 100 } });

    await listCampos({ per_page: 100 });

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/campos?per_page=100", expect.objectContaining({ credentials: "same-origin" }));
  });
});
