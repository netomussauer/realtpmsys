import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { relatorioService } from "@/features/relatorios/services/relatorio.service";
import { useFrequenciaAtleta } from "./use-frequencia-atleta";

vi.mock("@/features/relatorios/services/relatorio.service");

const mockedGetFrequenciaAtleta = vi.mocked(relatorioService.getFrequenciaAtleta);

afterEach(() => {
  vi.clearAllMocks();
});

const periodoValido = { data_inicio: "2026-01-01", data_fim: "2026-01-31" };

describe("useFrequenciaAtleta", () => {
  it("busca o relatório quando há atleta selecionado e período válido", async () => {
    const resultado = {
      atleta_id: "a1",
      data_inicio: "2026-01-01",
      data_fim: "2026-01-31",
      presentes: 8,
      ausentes: 2,
      justificados: 0,
      total: 10,
      taxa_presenca_pc: 80,
    };
    mockedGetFrequenciaAtleta.mockResolvedValue(resultado);

    const { result } = renderHook(() => useFrequenciaAtleta("a1", periodoValido), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetFrequenciaAtleta).toHaveBeenCalledWith("a1", periodoValido);
    expect(result.current.data).toEqual(resultado);
  });

  it("não dispara a query quando atletaId é undefined", () => {
    const { result } = renderHook(() => useFrequenciaAtleta(undefined, periodoValido), { wrapper: QueryWrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetFrequenciaAtleta).not.toHaveBeenCalled();
  });

  it("não dispara a query quando o período é inválido (data_fim antes de data_inicio)", () => {
    const { result } = renderHook(
      () => useFrequenciaAtleta("a1", { data_inicio: "2026-02-01", data_fim: "2026-01-01" }),
      { wrapper: QueryWrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetFrequenciaAtleta).not.toHaveBeenCalled();
  });

  it("não dispara a query quando o período está incompleto", () => {
    const { result } = renderHook(
      () => useFrequenciaAtleta("a1", { data_inicio: "2026-01-01", data_fim: "" }),
      { wrapper: QueryWrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetFrequenciaAtleta).not.toHaveBeenCalled();
  });
});
