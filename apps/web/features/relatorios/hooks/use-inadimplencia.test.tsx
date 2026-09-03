import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { relatorioService } from "@/features/relatorios/services/relatorio.service";
import { useInadimplencia } from "./use-inadimplencia";

vi.mock("@/features/relatorios/services/relatorio.service");

const mockedGetInadimplencia = vi.mocked(relatorioService.getInadimplencia);

afterEach(() => {
  vi.clearAllMocks();
});

describe("useInadimplencia", () => {
  it("busca o relatório com o filtro default ({}) e enabled=true por padrão", async () => {
    const payload = { data: [], resumo: { total_mensalidades: 0, total_atletas: 0, total_devido: "0" } };
    mockedGetInadimplencia.mockResolvedValue(payload);

    const { result } = renderHook(() => useInadimplencia(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetInadimplencia).toHaveBeenCalledWith({});
    expect(result.current.data).toEqual(payload);
  });

  it("busca o relatório com o filtro de competência informado", async () => {
    const payload = { data: [], resumo: { total_mensalidades: 0, total_atletas: 0, total_devido: "0" } };
    mockedGetInadimplencia.mockResolvedValue(payload);

    const { result } = renderHook(() => useInadimplencia({ competencia_ano: 2026, competencia_mes: 3 }), {
      wrapper: QueryWrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGetInadimplencia).toHaveBeenCalledWith({ competencia_ano: 2026, competencia_mes: 3 });
  });

  it("não dispara a query quando enabled=false (ex.: usuário não é ADMIN)", () => {
    const { result } = renderHook(() => useInadimplencia({}, false), { wrapper: QueryWrapper });

    expect(result.current.fetchStatus).toBe("idle");
    expect(mockedGetInadimplencia).not.toHaveBeenCalled();
  });

  it("expõe isError quando o serviço rejeita (403)", async () => {
    mockedGetInadimplencia.mockRejectedValue(new Error("Acesso restrito a administradores"));

    const { result } = renderHook(() => useInadimplencia(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("Acesso restrito a administradores");
  });
});
