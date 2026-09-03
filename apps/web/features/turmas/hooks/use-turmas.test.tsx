import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { turmaService } from "@/features/turmas/services/turma.service";
import { useTurmas } from "./use-turmas";

vi.mock("@/features/turmas/services/turma.service");

const mockedList = vi.mocked(turmaService.list);

describe("useTurmas", () => {
  beforeEach(() => {
    mockedList.mockReset();
  });

  it("busca a lista de turmas com o filtro informado", async () => {
    const response = {
      data: [{ id: "t1", nome: "Sub-13" }],
      pagination: { total: 1, page: 1, per_page: 20 },
    };
    mockedList.mockResolvedValue(response as never);

    const { result } = renderHook(() => useTurmas({ status: "ATIVA" }), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedList).toHaveBeenCalledWith({ status: "ATIVA" });
    expect(result.current.data).toEqual(response);
  });

  it("não dispara a query quando enabled=false", () => {
    renderHook(() => useTurmas({}, false), { wrapper: QueryWrapper });

    expect(mockedList).not.toHaveBeenCalled();
  });

  it("expõe o erro quando o serviço rejeita", async () => {
    mockedList.mockRejectedValue(new Error("Erro 500"));

    const { result } = renderHook(() => useTurmas(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error("Erro 500"));
  });
});
