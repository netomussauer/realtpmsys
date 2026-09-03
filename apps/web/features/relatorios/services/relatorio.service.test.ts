import { afterEach, describe, expect, it, vi } from "vitest";
import { relatorioService } from "./relatorio.service";

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

describe("relatorioService.getInadimplencia", () => {
  it("faz GET em /relatorios/inadimplencia sem query string quando o filtro está vazio", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], resumo: { total_mensalidades: 0, total_atletas: 0, total_devido: "0" } });

    await relatorioService.getInadimplencia();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/relatorios/inadimplencia",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("monta a query string com competencia_ano e competencia_mes", async () => {
    const fetchMock = mockFetchOnce(200, { data: [], resumo: { total_mensalidades: 0, total_atletas: 0, total_devido: "0" } });

    await relatorioService.getInadimplencia({ competencia_ano: 2026, competencia_mes: 3 });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/relatorios/inadimplencia?competencia_ano=2026&competencia_mes=3");
  });

  it("devolve data + resumo da resposta", async () => {
    const payload = {
      data: [{ mensalidade_id: "m1" }],
      resumo: { total_mensalidades: 1, total_atletas: 1, total_devido: "150.00" },
    };
    mockFetchOnce(200, payload);

    const result = await relatorioService.getInadimplencia();

    expect(result).toEqual(payload);
  });

  it("lança o erro do backend quando a resposta não é ok (403 — não-ADMIN)", async () => {
    mockFetchOnce(403, { detail: "Acesso restrito a administradores" });

    await expect(relatorioService.getInadimplencia()).rejects.toThrow("Acesso restrito a administradores");
  });
});

describe("relatorioService.getFrequenciaAtleta", () => {
  it("faz GET em /relatorios/frequencia/{atletaId} com data_inicio e data_fim", async () => {
    const fetchMock = mockFetchOnce(200, {
      atleta_id: "a1",
      data_inicio: "2026-01-01",
      data_fim: "2026-01-31",
      presentes: 8,
      ausentes: 2,
      justificados: 0,
      total: 10,
      taxa_presenca_pc: 80,
    });

    await relatorioService.getFrequenciaAtleta("a1", { data_inicio: "2026-01-01", data_fim: "2026-01-31" });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/relatorios/frequencia/a1?data_inicio=2026-01-01&data_fim=2026-01-31");
  });

  it("lança erro quando o backend responde 400 (período ausente ou inválido)", async () => {
    mockFetchOnce(400, { detail: "data_fim deve ser posterior a data_inicio" });

    await expect(
      relatorioService.getFrequenciaAtleta("a1", { data_inicio: "2026-02-01", data_fim: "2026-01-01" }),
    ).rejects.toThrow("data_fim deve ser posterior a data_inicio");
  });
});

describe("relatorioService.getFrequenciaTurma", () => {
  it("faz GET em /relatorios/frequencia/turma/{turmaId} com data_inicio e data_fim", async () => {
    const fetchMock = mockFetchOnce(200, {
      turma_id: "t1",
      data_inicio: "2026-01-01",
      data_fim: "2026-01-31",
      total_treinos: 10,
      data: [],
    });

    await relatorioService.getFrequenciaTurma("t1", { data_inicio: "2026-01-01", data_fim: "2026-01-31" });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/relatorios/frequencia/turma/t1?data_inicio=2026-01-01&data_fim=2026-01-31");
  });

  it("devolve a lista por atleta da turma", async () => {
    const payload = {
      turma_id: "t1",
      data_inicio: "2026-01-01",
      data_fim: "2026-01-31",
      total_treinos: 10,
      data: [{ atleta_id: "a1", atleta_nome: "João", presentes: 8, ausentes: 2, justificados: 0, total: 10, taxa_presenca_pc: 80 }],
    };
    mockFetchOnce(200, payload);

    const result = await relatorioService.getFrequenciaTurma("t1", { data_inicio: "2026-01-01", data_fim: "2026-01-31" });

    expect(result).toEqual(payload);
  });
});
