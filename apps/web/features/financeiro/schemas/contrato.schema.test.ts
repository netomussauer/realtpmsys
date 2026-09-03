import { describe, expect, it } from "vitest";
import { contratoSchema } from "./contrato.schema";

describe("contratoSchema", () => {
  it("aceita plano_id, data_inicio e valor_contratado válidos", () => {
    const result = contratoSchema.safeParse({
      plano_id: "123e4567-e89b-12d3-a456-426614174000",
      data_inicio: "2026-01-15",
      valor_contratado: "150.00",
    });
    expect(result.success).toBe(true);
  });

  it("aceita valor_contratado omitido (opcional)", () => {
    const result = contratoSchema.safeParse({
      plano_id: "123e4567-e89b-12d3-a456-426614174000",
      data_inicio: "2026-01-15",
    });
    expect(result.success).toBe(true);
  });

  it("aceita valor_contratado vazio e transforma para undefined", () => {
    const result = contratoSchema.safeParse({
      plano_id: "123e4567-e89b-12d3-a456-426614174000",
      data_inicio: "2026-01-15",
      valor_contratado: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.valor_contratado).toBeUndefined();
    }
  });

  it("rejeita plano_id que não é um uuid", () => {
    const result = contratoSchema.safeParse({
      plano_id: "nao-e-uuid",
      data_inicio: "2026-01-15",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Selecione um plano");
    }
  });

  it("rejeita data_inicio em formato inválido", () => {
    const result = contratoSchema.safeParse({
      plano_id: "123e4567-e89b-12d3-a456-426614174000",
      data_inicio: "15/01/2026",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Data inválida (use AAAA-MM-DD)");
    }
  });

  it("rejeita valor_contratado em formato inválido", () => {
    const result = contratoSchema.safeParse({
      plano_id: "123e4567-e89b-12d3-a456-426614174000",
      data_inicio: "2026-01-15",
      valor_contratado: "abc",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Valor inválido (use o formato 150.00)");
    }
  });
});
