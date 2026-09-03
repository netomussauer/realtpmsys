import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { financeiroService } from "../services/financeiro.service";
import { usePlanosAtivos } from "./use-planos";

vi.mock("../services/financeiro.service");

const mockedList = vi.mocked(financeiroService.listPlanosAtivos);

describe("usePlanosAtivos", () => {
  it("filtra client-side só os planos ativos", async () => {
    mockedList.mockResolvedValue({
      data: [
        { id: "p1", nome: "Mensal", dias_semana: 3, valor_mensal: "150.00", dia_vencimento: 10, ativo: true },
        { id: "p2", nome: "Antigo", dias_semana: 2, valor_mensal: "100.00", dia_vencimento: 5, ativo: false },
      ],
    });

    const { result } = renderHook(() => usePlanosAtivos(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([
      { id: "p1", nome: "Mensal", dias_semana: 3, valor_mensal: "150.00", dia_vencimento: 10, ativo: true },
    ]);
  });

  it("data fica undefined enquanto a query não resolveu", () => {
    mockedList.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => usePlanosAtivos(), { wrapper: QueryWrapper });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(true);
  });
});
