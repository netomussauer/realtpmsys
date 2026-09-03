import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { atletaService } from "@/features/atletas/services/atleta.service";
import { useAtleta, useResponsaveisDoAtleta, useUniformeDoAtleta } from "./use-atleta";

vi.mock("@/features/atletas/services/atleta.service");

const mockedGetById = vi.mocked(atletaService.getById);
const mockedListResponsaveis = vi.mocked(atletaService.listResponsaveis);
const mockedGetUniforme = vi.mocked(atletaService.getUniforme);

afterEach(() => {
  vi.clearAllMocks();
});

describe("useAtleta", () => {
  it("busca o atleta por id e devolve os dados", async () => {
    const atleta = { id: "a1", nome: "João", status: "ATIVO" } as never;
    mockedGetById.mockResolvedValue(atleta);

    const { result } = renderHook(() => useAtleta("a1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetById).toHaveBeenCalledWith("a1");
    expect(result.current.data).toEqual(atleta);
  });

  it("não dispara a query quando id é undefined", () => {
    const { result } = renderHook(() => useAtleta(undefined), { wrapper: QueryWrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetById).not.toHaveBeenCalled();
  });

  it("expõe isError quando o serviço rejeita", async () => {
    mockedGetById.mockRejectedValue(new Error("Erro 404"));

    const { result } = renderHook(() => useAtleta("inexistente"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("Erro 404");
  });
});

describe("useResponsaveisDoAtleta", () => {
  it("busca a lista de responsáveis do atleta", async () => {
    const payload = { data: [{ id: "r1", nome: "Maria" }] } as never;
    mockedListResponsaveis.mockResolvedValue(payload);

    const { result } = renderHook(() => useResponsaveisDoAtleta("a1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListResponsaveis).toHaveBeenCalledWith("a1");
    expect(result.current.data).toEqual(payload);
  });

  it("não dispara a query quando atletaId é undefined", () => {
    const { result } = renderHook(() => useResponsaveisDoAtleta(undefined), { wrapper: QueryWrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedListResponsaveis).not.toHaveBeenCalled();
  });
});

describe("useUniformeDoAtleta", () => {
  it("busca o uniforme do atleta", async () => {
    const uniforme = { id: "u1", tam_camisa: "M" } as never;
    mockedGetUniforme.mockResolvedValue(uniforme);

    const { result } = renderHook(() => useUniformeDoAtleta("a1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetUniforme).toHaveBeenCalledWith("a1");
    expect(result.current.data).toEqual(uniforme);
  });

  it("devolve data null quando o atleta ainda não tem uniforme", async () => {
    mockedGetUniforme.mockResolvedValue(null);

    const { result } = renderHook(() => useUniformeDoAtleta("a1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it("não dispara a query quando atletaId é undefined", () => {
    const { result } = renderHook(() => useUniformeDoAtleta(undefined), { wrapper: QueryWrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetUniforme).not.toHaveBeenCalled();
  });
});
