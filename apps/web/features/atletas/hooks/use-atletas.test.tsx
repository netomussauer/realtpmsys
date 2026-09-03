import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { atletaService } from "@/features/atletas/services/atleta.service";
import { useAtletas } from "./use-atletas";

vi.mock("@/features/atletas/services/atleta.service");

const mockedList = vi.mocked(atletaService.list);

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAtletas", () => {
  it("busca a lista com o filtro default ({}) quando nenhum é passado", async () => {
    const payload = { data: [], pagination: { total: 0, page: 1, per_page: 20 } };
    mockedList.mockResolvedValue(payload);

    const { result } = renderHook(() => useAtletas(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedList).toHaveBeenCalledWith({});
    expect(result.current.data).toEqual(payload);
  });

  it("busca a lista com o filtro informado", async () => {
    const payload = { data: [{ id: "a1" }], pagination: { total: 1, page: 2, per_page: 20 } };
    mockedList.mockResolvedValue(payload as never);

    const { result } = renderHook(() => useAtletas({ status: "ATIVO", page: 2 }), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedList).toHaveBeenCalledWith({ status: "ATIVO", page: 2 });
  });

  it("não dispara a query quando enabled=false", () => {
    const { result } = renderHook(() => useAtletas({}, false), { wrapper: QueryWrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("expõe isError quando o serviço rejeita (ex.: 403 de um perfil sem acesso)", async () => {
    mockedList.mockRejectedValue(new Error("Acesso negado"));

    const { result } = renderHook(() => useAtletas(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("Acesso negado");
  });
});
