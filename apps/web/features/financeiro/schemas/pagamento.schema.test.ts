import { describe, expect, it } from "vitest";
import { pagamentoSchema } from "./pagamento.schema";

describe("pagamentoSchema", () => {
  it("aceita valor_pago, data_pagamento e forma_pagamento válidos", () => {
    const result = pagamentoSchema.safeParse({
      valor_pago: "150.00",
      data_pagamento: "2026-01-15",
      forma_pagamento: "PIX",
    });
    expect(result.success).toBe(true);
  });

  it("aceita observacao omitida (opcional)", () => {
    const result = pagamentoSchema.safeParse({
      valor_pago: "150.00",
      data_pagamento: "2026-01-15",
      forma_pagamento: "PIX",
    });
    expect(result.success).toBe(true);
  });

  it("aceita observacao vazia (sem regex, permanece string vazia)", () => {
    // Diferente de contrato.schema.ts (valor_contratado) — observacao não
    // tem regex, então "" já é uma string válida pelo 1º ramo do `.or()` e
    // nunca chega no `.transform(() => undefined)`.
    const result = pagamentoSchema.safeParse({
      valor_pago: "150.00",
      data_pagamento: "2026-01-15",
      forma_pagamento: "PIX",
      observacao: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.observacao).toBe("");
    }
  });

  it("rejeita valor_pago em formato inválido", () => {
    const result = pagamentoSchema.safeParse({
      valor_pago: "abc",
      data_pagamento: "2026-01-15",
      forma_pagamento: "PIX",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Valor inválido (use o formato 150.00)");
    }
  });

  it("rejeita valor_pago igual a zero", () => {
    const result = pagamentoSchema.safeParse({
      valor_pago: "0.00",
      data_pagamento: "2026-01-15",
      forma_pagamento: "PIX",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Valor deve ser maior que zero");
    }
  });

  it("rejeita data_pagamento em formato inválido", () => {
    const result = pagamentoSchema.safeParse({
      valor_pago: "150.00",
      data_pagamento: "15/01/2026",
      forma_pagamento: "PIX",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Data inválida (use AAAA-MM-DD)");
    }
  });

  it("rejeita forma_pagamento vazia", () => {
    const result = pagamentoSchema.safeParse({
      valor_pago: "150.00",
      data_pagamento: "2026-01-15",
      forma_pagamento: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Selecione a forma de pagamento");
    }
  });

  it("rejeita observacao maior que 300 caracteres", () => {
    const result = pagamentoSchema.safeParse({
      valor_pago: "150.00",
      data_pagamento: "2026-01-15",
      forma_pagamento: "PIX",
      observacao: "a".repeat(301),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Observação muito longa");
    }
  });
});
