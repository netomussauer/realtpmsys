import { describe, expect, it } from "vitest";
import { periodoSchema, isPeriodoValido } from "./periodo.schema";

describe("periodoSchema", () => {
  it("aceita data_inicio e data_fim válidos (data_fim depois de data_inicio)", () => {
    const result = periodoSchema.safeParse({ data_inicio: "2026-01-01", data_fim: "2026-01-31" });
    expect(result.success).toBe(true);
  });

  it("aceita data_inicio igual a data_fim", () => {
    const result = periodoSchema.safeParse({ data_inicio: "2026-01-01", data_fim: "2026-01-01" });
    expect(result.success).toBe(true);
  });

  it("rejeita data_inicio em formato inválido", () => {
    const result = periodoSchema.safeParse({ data_inicio: "01-01-2026", data_fim: "2026-01-31" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Informe a data inicial");
    }
  });

  it("rejeita data_fim em formato inválido", () => {
    const result = periodoSchema.safeParse({ data_inicio: "2026-01-01", data_fim: "31-01-2026" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Informe a data final");
    }
  });

  it("rejeita quando data_fim é anterior a data_inicio, apontando o erro em data_fim", () => {
    const result = periodoSchema.safeParse({ data_inicio: "2026-02-01", data_fim: "2026-01-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Data final deve ser igual ou depois da data inicial");
      expect(result.error.issues[0].path).toEqual(["data_fim"]);
    }
  });
});

describe("isPeriodoValido", () => {
  it("devolve true para um período válido", () => {
    expect(isPeriodoValido({ data_inicio: "2026-01-01", data_fim: "2026-01-31" })).toBe(true);
  });

  it("devolve false quando data_fim é anterior a data_inicio", () => {
    expect(isPeriodoValido({ data_inicio: "2026-02-01", data_fim: "2026-01-01" })).toBe(false);
  });

  it("devolve false quando os campos estão vazios", () => {
    expect(isPeriodoValido({ data_inicio: "", data_fim: "" })).toBe(false);
  });
});
