import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { turmaService } from "@/features/turmas/services/turma.service";
import { useMatriculas } from "./use-matriculas";

vi.mock("@/features/turmas/services/turma.service");

const mockedListMatriculas = vi.mocked(turmaService.listMatriculas);

describe("useMatriculas", () => {
  beforeEach(() => {
    mockedListMatriculas.mockReset();
  });

  it("busca as matrículas da turma com o filtro informado", async () => {
    const response = {
      data: [{ id: "m1", atleta_id: "a1", turma_id: "t1", data_inicio: "2026-01-01", status: "ATIVA" }],
      pagination: { total: 1, page: 1, per_page: 20 },
    };
    mockedListMatriculas.mockResolvedValue(response as never);

    const { result } = renderHook(() => useMatriculas("t1", { status: "ATIVA" }), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListMatriculas).toHaveBeenCalledWith("t1", { status: "ATIVA" });
    expect(result.current.data).toEqual(response);
  });

  it("não dispara a query quando turmaId é undefined", () => {
    renderHook(() => useMatriculas(undefined), { wrapper: QueryWrapper });

    expect(mockedListMatriculas).not.toHaveBeenCalled();
  });

  it("expõe o erro quando o serviço rejeita", async () => {
    mockedListMatriculas.mockRejectedValue(new Error("Erro 500"));

    const { result } = renderHook(() => useMatriculas("t1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error("Erro 500"));
  });
});
