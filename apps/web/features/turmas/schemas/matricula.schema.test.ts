import { describe, expect, it } from "vitest";
import { matriculaSchema } from "./matricula.schema";

describe("matriculaSchema", () => {
  it("aceita atleta_id (UUID) e data_inicio (YYYY-MM-DD) válidos", () => {
    const result = matriculaSchema.safeParse({
      atleta_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      data_inicio: "2026-01-01",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita atleta_id que não é um UUID válido", () => {
    const result = matriculaSchema.safeParse({ atleta_id: "nao-uuid", data_inicio: "2026-01-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Selecione um atleta");
    }
  });

  it("rejeita atleta_id vazio", () => {
    const result = matriculaSchema.safeParse({ atleta_id: "", data_inicio: "2026-01-01" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Selecione um atleta");
    }
  });

  it("rejeita data_inicio fora do formato YYYY-MM-DD", () => {
    const result = matriculaSchema.safeParse({
      atleta_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      data_inicio: "01/01/2026",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Data inválida (use YYYY-MM-DD)");
    }
  });

  it("rejeita data_inicio vazia", () => {
    const result = matriculaSchema.safeParse({
      atleta_id: "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      data_inicio: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Data inválida (use YYYY-MM-DD)");
    }
  });
});
