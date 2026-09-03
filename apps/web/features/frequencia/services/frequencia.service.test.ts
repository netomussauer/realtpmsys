import { afterEach, describe, expect, it, vi } from "vitest";
import { frequenciaService } from "./frequencia.service";

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

describe("frequenciaService.listTreinos", () => {
  it("faz GET em /api/v1/turmas/{turmaId}/treinos sem query string quando o filtro está vazio", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 1, per_page: 30 } });

    await frequenciaService.listTreinos("t1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/turmas/t1/treinos",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("monta a query string a partir do filtro de período", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], pagination: { total: 0, page: 1, per_page: 30 } });

    await frequenciaService.listTreinos("t1", { data_inicio: "2026-01-01", data_fim: "2026-01-31" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/turmas/t1/treinos?data_inicio=2026-01-01&data_fim=2026-01-31",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("lança o erro do backend quando a listagem falha", async () => {
    mockFetchOnce(403, { detail: "acesso negado" });

    await expect(frequenciaService.listTreinos("t1")).rejects.toThrow("acesso negado");
  });
});

describe("frequenciaService.criarTreino", () => {
  it("faz POST em /api/v1/turmas/{turmaId}/treinos com o body", async () => {
    const dto = { id: "tr1", turma_id: "t1", data_treino: "2026-08-20", criado_em: "2026-08-01T00:00:00Z" };
    const fetchMock = mockFetchOnce(201, dto);
    const data = { data_treino: "2026-08-20" };

    const result = await frequenciaService.criarTreino("t1", data);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/turmas/t1/treinos",
      expect.objectContaining({ method: "POST", body: JSON.stringify(data) }),
    );
    expect(result).toEqual(dto);
  });

  it("lança o erro do backend quando já existe treino para a turma na data (conflito)", async () => {
    mockFetchOnce(409, { detail: "já existe treino para a turma t1 na data 2026-08-20" });

    await expect(
      frequenciaService.criarTreino("t1", { data_treino: "2026-08-20" }),
    ).rejects.toThrow("já existe treino para a turma t1 na data 2026-08-20");
  });
});

describe("frequenciaService.listFrequencias", () => {
  it("faz GET em /api/v1/treinos/{treinoId}/frequencias", async () => {
    const response = { data: [] };
    const fetchMock = mockFetchOnce(200, response);

    const result = await frequenciaService.listFrequencias("tr1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/treinos/tr1/frequencias",
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(result).toEqual(response);
  });
});

describe("frequenciaService.lancarFrequencias", () => {
  it("faz POST em /api/v1/treinos/{treinoId}/frequencias com o body do lote", async () => {
    const response = { treino_id: "tr1", total: 2 };
    const fetchMock = mockFetchOnce(200, response);
    const data = {
      registros: [
        { atleta_id: "a1", presenca: "PRESENTE" as const },
        { atleta_id: "a2", presenca: "AUSENTE" as const },
      ],
    };

    const result = await frequenciaService.lancarFrequencias("tr1", data);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/treinos/tr1/frequencias",
      expect.objectContaining({ method: "POST", body: JSON.stringify(data) }),
    );
    expect(result).toEqual(response);
  });

  it("lança o erro do backend quando o treino não é encontrado", async () => {
    mockFetchOnce(404, { detail: "treino tr1 não encontrado" });

    await expect(
      frequenciaService.lancarFrequencias("tr1", { registros: [{ atleta_id: "a1", presenca: "PRESENTE" }] }),
    ).rejects.toThrow("treino tr1 não encontrado");
  });
});
