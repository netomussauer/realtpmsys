import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { frequenciaService } from "../services/frequencia.service";
import { useTreinos } from "./use-treinos";

vi.mock("../services/frequencia.service");

const mockedList = vi.mocked(frequenciaService.listTreinos);

beforeEach(() => {
  mockedList.mockReset();
});

describe("useTreinos", () => {
  it("busca os treinos da turma com o filtro informado", async () => {
    const response = {
      data: [{ id: "tr1", turma_id: "t1", data_treino: "2026-08-20", criado_em: "2026-08-01T00:00:00Z" }],
      pagination: { total: 1, page: 1, per_page: 30 },
    };
    mockedList.mockResolvedValue(response);

    const { result } = renderHook(() => useTreinos("t1", { data_inicio: "2026-08-01" }), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedList).toHaveBeenCalledWith("t1", { data_inicio: "2026-08-01" });
    expect(result.current.data).toEqual(response);
  });

  it("não dispara a query quando turmaId é undefined", async () => {
    renderHook(() => useTreinos(undefined), { wrapper: QueryWrapper });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("expõe o erro quando a listagem falha", async () => {
    mockedList.mockRejectedValue(new Error("acesso negado"));

    const { result } = renderHook(() => useTreinos("t1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("acesso negado");
  });
});
