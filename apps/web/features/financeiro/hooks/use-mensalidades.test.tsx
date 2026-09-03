import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { financeiroService } from "../services/financeiro.service";
import { useMensalidades, useMensalidade } from "./use-mensalidades";

vi.mock("../services/financeiro.service");

const mockedList = vi.mocked(financeiroService.listMensalidades);
const mockedGet = vi.mocked(financeiroService.getMensalidade);

beforeEach(() => {
  mockedList.mockReset();
  mockedGet.mockReset();
});

describe("useMensalidades", () => {
  it("busca a lista com o filtro informado e expõe data/resumo", async () => {
    const response = {
      data: [{ id: "m1", atleta_id: "a1", competencia_ano: 2026, competencia_mes: 8, data_vencimento: "2026-08-10", valor: "150.00", status: "PENDENTE" as const }],
      pagination: { total: 1, page: 1, per_page: 20 },
      resumo: { total_pendente: "150.00", total_vencido: "0", total_pago: "0" },
    };
    mockedList.mockResolvedValue(response);

    const { result } = renderHook(() => useMensalidades({ status: "PENDENTE" }), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedList).toHaveBeenCalledWith({ status: "PENDENTE" });
    expect(result.current.data).toEqual(response);
  });

  it("usa filtro vazio por padrão e fica habilitado por padrão", async () => {
    mockedList.mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, per_page: 20 },
      resumo: { total_pendente: "0", total_vencido: "0", total_pago: "0" },
    });

    renderHook(() => useMensalidades(), { wrapper: QueryWrapper });

    await waitFor(() => expect(mockedList).toHaveBeenCalledWith({}));
  });

  it("não dispara a query quando enabled=false", async () => {
    renderHook(() => useMensalidades({}, false), { wrapper: QueryWrapper });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockedList).not.toHaveBeenCalled();
  });

  it("expõe o erro quando a listagem falha", async () => {
    mockedList.mockRejectedValue(new Error("acesso negado"));

    const { result } = renderHook(() => useMensalidades(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("acesso negado");
  });
});

describe("useMensalidade", () => {
  it("busca o detalhe quando id está definido", async () => {
    const dto = { id: "m1", atleta_id: "a1", competencia_ano: 2026, competencia_mes: 8, data_vencimento: "2026-08-10", valor: "150.00", status: "PENDENTE" as const };
    mockedGet.mockResolvedValue(dto);

    const { result } = renderHook(() => useMensalidade("m1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockedGet).toHaveBeenCalledWith("m1");
    expect(result.current.data).toEqual(dto);
  });

  it("não dispara a query quando id é undefined", async () => {
    renderHook(() => useMensalidade(undefined), { wrapper: QueryWrapper });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockedGet).not.toHaveBeenCalled();
  });
});
