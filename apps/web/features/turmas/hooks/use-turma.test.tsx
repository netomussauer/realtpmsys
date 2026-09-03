import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { turmaService } from "@/features/turmas/services/turma.service";
import { useTurma } from "./use-turma";

vi.mock("@/features/turmas/services/turma.service");

const mockedGetById = vi.mocked(turmaService.getById);

describe("useTurma", () => {
  beforeEach(() => {
    mockedGetById.mockReset();
  });

  it("busca a turma pelo id quando o id está disponível", async () => {
    const turma = { id: "t1", nome: "Sub-13" };
    mockedGetById.mockResolvedValue(turma as never);

    const { result } = renderHook(() => useTurma("t1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetById).toHaveBeenCalledWith("t1");
    expect(result.current.data).toEqual(turma);
  });

  it("não dispara a query quando o id é undefined (evita GET /turmas/undefined)", () => {
    renderHook(() => useTurma(undefined), { wrapper: QueryWrapper });

    expect(mockedGetById).not.toHaveBeenCalled();
  });

  it("expõe o erro quando o serviço rejeita (ex.: 404)", async () => {
    mockedGetById.mockRejectedValue(new Error("Erro 404"));

    const { result } = renderHook(() => useTurma("inexistente"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error("Erro 404"));
  });
});
