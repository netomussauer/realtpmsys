import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/shared/test-utils/setup-query";
import { financeiroService } from "../services/financeiro.service";
import {
  usePagarMensalidade,
  useCancelarMensalidade,
  useGerarMensalidades,
  useFirmarContrato,
} from "./use-mutations";

vi.mock("../services/financeiro.service");

const mockedPagar = vi.mocked(financeiroService.pagar);
const mockedCancelar = vi.mocked(financeiroService.cancelarMensalidade);
const mockedGerar = vi.mocked(financeiroService.gerarMensalidades);
const mockedFirmar = vi.mocked(financeiroService.firmarContrato);

function wrapperWithClient(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("usePagarMensalidade", () => {
  it("chama financeiroService.pagar e invalida a lista de mensalidades", async () => {
    // gcTime default (não 0) aqui — com gcTime:0 do createTestQueryClient
    // padrão, o setQueryData("detail", id) some do cache antes do assert
    // por falta de observer ativo naquela chave.
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const dto = { id: "m1", atleta_id: "a1", competencia_ano: 2026, competencia_mes: 8, data_vencimento: "2026-08-10", valor: "150.00", status: "PAGO" as const };
    mockedPagar.mockResolvedValue(dto);

    const { result } = renderHook(() => usePagarMensalidade(), { wrapper: wrapperWithClient(client) });

    result.current.mutate({ id: "m1", data: { valor_pago: "150.00", data_pagamento: "2026-08-10", forma_pagamento: "PIX" } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedPagar).toHaveBeenCalledWith("m1", { valor_pago: "150.00", data_pagamento: "2026-08-10", forma_pagamento: "PIX" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["mensalidades", "list"] });
    expect(client.getQueryData(["mensalidades", "detail", "m1"])).toEqual(dto);
  });

  it("expõe o erro quando o pagamento falha", async () => {
    mockedPagar.mockRejectedValue(new Error("mensalidade já paga"));
    const { result } = renderHook(() => usePagarMensalidade(), { wrapper: wrapperWithClient(createTestQueryClient()) });

    result.current.mutate({ id: "m1", data: { valor_pago: "150.00", data_pagamento: "2026-08-10", forma_pagamento: "PIX" } });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("mensalidade já paga");
  });
});

describe("useCancelarMensalidade", () => {
  it("chama financeiroService.cancelarMensalidade e invalida a lista", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const dto = { id: "m1", atleta_id: "a1", competencia_ano: 2026, competencia_mes: 8, data_vencimento: "2026-08-10", valor: "150.00", status: "CANCELADO" as const };
    mockedCancelar.mockResolvedValue(dto);

    const { result } = renderHook(() => useCancelarMensalidade(), { wrapper: wrapperWithClient(client) });

    result.current.mutate("m1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedCancelar).toHaveBeenCalledWith("m1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["mensalidades", "list"] });
  });
});

describe("useGerarMensalidades", () => {
  it("chama financeiroService.gerarMensalidades e invalida a lista", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    mockedGerar.mockResolvedValue({ geradas: 5, ignoradas: 1, com_erro: 0 });

    const { result } = renderHook(() => useGerarMensalidades(), { wrapper: wrapperWithClient(client) });

    result.current.mutate({ competencia_ano: 2026, competencia_mes: 8 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedGerar).toHaveBeenCalledWith({ competencia_ano: 2026, competencia_mes: 8 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["mensalidades", "list"] });
    expect(result.current.data).toEqual({ geradas: 5, ignoradas: 1, com_erro: 0 });
  });
});

describe("useFirmarContrato", () => {
  it("chama financeiroService.firmarContrato com o atletaId do hook", async () => {
    const dto = { id: "c1", atleta_id: "a1", plano_id: "p1", data_inicio: "2026-01-01", valor_contratado: "150.00", status: "ATIVO" as const };
    mockedFirmar.mockResolvedValue(dto);

    const { result } = renderHook(() => useFirmarContrato("a1"), { wrapper: wrapperWithClient(createTestQueryClient()) });

    result.current.mutate({ plano_id: "p1", data_inicio: "2026-01-01" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedFirmar).toHaveBeenCalledWith("a1", { plano_id: "p1", data_inicio: "2026-01-01" });
    expect(result.current.data).toEqual(dto);
  });

  it("expõe o erro quando a criação do contrato falha", async () => {
    mockedFirmar.mockRejectedValue(new Error("atleta já possui contrato ativo"));

    const { result } = renderHook(() => useFirmarContrato("a1"), { wrapper: wrapperWithClient(createTestQueryClient()) });

    result.current.mutate({ plano_id: "p1", data_inicio: "2026-01-01" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("atleta já possui contrato ativo");
  });
});
