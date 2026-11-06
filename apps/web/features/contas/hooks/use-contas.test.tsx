import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { contaService } from "@/features/contas/services/conta.service";
import { useContas } from "./use-contas";
import { useConta } from "./use-conta";

vi.mock("@/features/contas/services/conta.service");

const mockedList = vi.mocked(contaService.list);
const mockedGet = vi.mocked(contaService.getById);

describe("useContas", () => {
  beforeEach(() => {
    mockedList.mockReset();
  });

  it("busca a lista com o filtro informado", async () => {
    const response = { data: [{ id: "u1" }], pagination: { total: 1, page: 1, per_page: 20 } };
    mockedList.mockResolvedValue(response as never);

    const { result } = renderHook(() => useContas({ perfil: "ADMIN" }), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedList).toHaveBeenCalledWith({ perfil: "ADMIN" });
    expect(result.current.data).toEqual(response);
  });

  it("expõe o erro quando o serviço rejeita", async () => {
    mockedList.mockRejectedValue(new Error("permissão insuficiente"));

    const { result } = renderHook(() => useContas(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error("permissão insuficiente"));
  });
});

describe("useConta", () => {
  beforeEach(() => {
    mockedGet.mockReset();
  });

  it("busca o detalhe pelo id", async () => {
    mockedGet.mockResolvedValue({ id: "u1", email: "a@b.co" } as never);

    const { result } = renderHook(() => useConta("u1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockedGet).toHaveBeenCalledWith("u1");
  });

  it("não dispara a query sem id", () => {
    renderHook(() => useConta(undefined), { wrapper: QueryWrapper });
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
