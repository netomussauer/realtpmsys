import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { relatorioService } from "@/features/relatorios/services/relatorio.service";
import { useFrequenciaTurma } from "./use-frequencia-turma";

vi.mock("@/features/relatorios/services/relatorio.service");

const mockedGetFrequenciaTurma = vi.mocked(relatorioService.getFrequenciaTurma);

afterEach(() => {
  vi.clearAllMocks();
});

const periodoValido = { data_inicio: "2026-01-01", data_fim: "2026-01-31" };

describe("useFrequenciaTurma", () => {
  it("busca o relatório quando há turma selecionada e período válido", async () => {
    const resultado = {
      turma_id: "t1",
      data_inicio: "2026-01-01",
      data_fim: "2026-01-31",
      total_treinos: 10,
      data: [],
    };
    mockedGetFrequenciaTurma.mockResolvedValue(resultado);

    const { result } = renderHook(() => useFrequenciaTurma("t1", periodoValido), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetFrequenciaTurma).toHaveBeenCalledWith("t1", periodoValido);
    expect(result.current.data).toEqual(resultado);
  });

  it("não dispara a query quando turmaId é undefined", () => {
    const { result } = renderHook(() => useFrequenciaTurma(undefined, periodoValido), { wrapper: QueryWrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetFrequenciaTurma).not.toHaveBeenCalled();
  });

  it("não dispara a query quando o período é inválido", () => {
    const { result } = renderHook(
      () => useFrequenciaTurma("t1", { data_inicio: "2026-02-01", data_fim: "2026-01-01" }),
      { wrapper: QueryWrapper },
    );

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetFrequenciaTurma).not.toHaveBeenCalled();
  });
});
