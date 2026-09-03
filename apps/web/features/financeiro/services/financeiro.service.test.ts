import { afterEach, describe, expect, it, vi } from "vitest";
import { financeiroService } from "./financeiro.service";

function mockFetchOnce(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("financeiroService.listMensalidades", () => {
  it("faz GET em /api/v1/mensalidades sem query string quando o filtro está vazio", async () => {
    const fetchMock = mockFetchOnce(200, {
      data: [],
      pagination: { total: 0, page: 1, per_page: 20 },
      resumo: { total_pendente: "0", total_vencido: "0", total_pago: "0" },
    });

    await financeiroService.listMensalidades();

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/mensalidades",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("monta a query string a partir do filtro", async () => {
    const fetchMock = mockFetchOnce(200, {
      data: [],
      pagination: { total: 0, page: 1, per_page: 20 },
      resumo: { total_pendente: "0", total_vencido: "0", total_pago: "0" },
    });

    await financeiroService.listMensalidades({ status: "PENDENTE", page: 2 });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/mensalidades?status=PENDENTE&page=2",
      expect.objectContaining({ credentials: "same-origin" }),
    );
  });

  it("lança o erro devolvido pelo backend quando a resposta não é ok", async () => {
    mockFetchOnce(403, { detail: "acesso negado" });

    await expect(financeiroService.listMensalidades()).rejects.toThrow("acesso negado");
  });
});

describe("financeiroService.getMensalidade", () => {
  it("faz GET em /api/v1/mensalidades/{id}", async () => {
    const dto = { id: "m1", atleta_id: "a1", competencia_ano: 2026, competencia_mes: 1, data_vencimento: "2026-01-10", valor: "150.00", status: "PENDENTE" };
    const fetchMock = mockFetchOnce(200, dto);

    const result = await financeiroService.getMensalidade("m1");

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/mensalidades/m1", expect.objectContaining({ credentials: "same-origin" }));
    expect(result).toEqual(dto);
  });
});

describe("financeiroService.pagar", () => {
  it("faz PATCH em /api/v1/mensalidades/{id}/pagar com o body", async () => {
    const dto = { id: "m1", atleta_id: "a1", competencia_ano: 2026, competencia_mes: 1, data_vencimento: "2026-01-10", valor: "150.00", status: "PAGO" };
    const fetchMock = mockFetchOnce(200, dto);
    const data = { valor_pago: "150.00", data_pagamento: "2026-01-10", forma_pagamento: "PIX" };

    const result = await financeiroService.pagar("m1", data);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/mensalidades/m1/pagar",
      expect.objectContaining({ method: "PATCH", body: JSON.stringify(data) }),
    );
    expect(result).toEqual(dto);
  });

  it("lança o erro do backend quando o pagamento falha", async () => {
    mockFetchOnce(409, { detail: "mensalidade já paga" });

    await expect(
      financeiroService.pagar("m1", { valor_pago: "150.00", data_pagamento: "2026-01-10", forma_pagamento: "PIX" }),
    ).rejects.toThrow("mensalidade já paga");
  });
});

describe("financeiroService.cancelarMensalidade", () => {
  it("faz PATCH em /api/v1/mensalidades/{id}/cancelar sem body", async () => {
    const dto = { id: "m1", atleta_id: "a1", competencia_ano: 2026, competencia_mes: 1, data_vencimento: "2026-01-10", valor: "150.00", status: "CANCELADO" };
    const fetchMock = mockFetchOnce(200, dto);

    const result = await financeiroService.cancelarMensalidade("m1");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/mensalidades/m1/cancelar",
      expect.objectContaining({ method: "PATCH" }),
    );
    expect(result).toEqual(dto);
  });
});

describe("financeiroService.gerarMensalidades", () => {
  it("faz POST em /api/v1/mensalidades/gerar com o body", async () => {
    const response = { geradas: 10, ignoradas: 2, com_erro: 0 };
    const fetchMock = mockFetchOnce(200, response);
    const data = { competencia_ano: 2026, competencia_mes: 8 };

    const result = await financeiroService.gerarMensalidades(data);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/mensalidades/gerar",
      expect.objectContaining({ method: "POST", body: JSON.stringify(data) }),
    );
    expect(result).toEqual(response);
  });
});

describe("financeiroService.firmarContrato", () => {
  it("faz POST em /api/v1/contratos com atleta_id + dados do formulário", async () => {
    const dto = { id: "c1", atleta_id: "a1", plano_id: "p1", data_inicio: "2026-01-01", valor_contratado: "150.00", status: "ATIVO" };
    const fetchMock = mockFetchOnce(201, dto);

    const result = await financeiroService.firmarContrato("a1", {
      plano_id: "p1",
      data_inicio: "2026-01-01",
      valor_contratado: "150.00",
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/contratos",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          atleta_id: "a1",
          plano_id: "p1",
          data_inicio: "2026-01-01",
          valor_contratado: "150.00",
        }),
      }),
    );
    expect(result).toEqual(dto);
  });

  it("omite valor_contratado do body quando não informado", async () => {
    const dto = { id: "c1", atleta_id: "a1", plano_id: "p1", data_inicio: "2026-01-01", valor_contratado: "150.00", status: "ATIVO" };
    const fetchMock = mockFetchOnce(201, dto);

    await financeiroService.firmarContrato("a1", { plano_id: "p1", data_inicio: "2026-01-01" });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/contratos",
      expect.objectContaining({
        body: JSON.stringify({ atleta_id: "a1", plano_id: "p1", data_inicio: "2026-01-01" }),
      }),
    );
  });

  it("lança o erro do backend quando a criação do contrato falha", async () => {
    mockFetchOnce(409, { detail: "atleta já possui contrato ativo" });

    await expect(
      financeiroService.firmarContrato("a1", { plano_id: "p1", data_inicio: "2026-01-01" }),
    ).rejects.toThrow("atleta já possui contrato ativo");
  });
});

describe("financeiroService.listPlanosAtivos", () => {
  it("faz GET em /api/v1/planos", async () => {
    const response = { data: [{ id: "p1", nome: "Mensal", dias_semana: 3, valor_mensal: "150.00", dia_vencimento: 10, ativo: true }] };
    const fetchMock = mockFetchOnce(200, response);

    const result = await financeiroService.listPlanosAtivos();

    expect(fetchMock).toHaveBeenCalledWith("/api/v1/planos", expect.objectContaining({ credentials: "same-origin" }));
    expect(result).toEqual(response);
  });
});
