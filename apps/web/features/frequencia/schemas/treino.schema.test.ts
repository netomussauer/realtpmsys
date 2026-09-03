import { describe, expect, it } from "vitest";
import { treinoSchema } from "./treino.schema";

describe("treinoSchema", () => {
  it("aceita data_treino sozinha, sem horário", () => {
    const result = treinoSchema.safeParse({ data_treino: "2026-08-20" });
    expect(result.success).toBe(true);
  });

  it("aceita data_treino com hora_inicio e hora_fim válidas (fim > início)", () => {
    const result = treinoSchema.safeParse({
      data_treino: "2026-08-20",
      hora_inicio: "18:00",
      hora_fim: "19:30",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita data_treino em formato inválido", () => {
    const result = treinoSchema.safeParse({ data_treino: "20/08/2026" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Data inválida (use AAAA-MM-DD)");
    }
  });

  it("rejeita hora_inicio em formato inválido", () => {
    const result = treinoSchema.safeParse({ data_treino: "2026-08-20", hora_inicio: "25:99", hora_fim: "19:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hora inválida (HH:MM)");
    }
  });

  it("rejeita quando só hora_inicio é informada (falta hora_fim)", () => {
    const result = treinoSchema.safeParse({ data_treino: "2026-08-20", hora_inicio: "18:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Informe hora início e hora fim juntas, ou deixe as duas em branco",
      );
      expect(result.error.issues[0].path).toEqual(["hora_fim"]);
    }
  });

  it("rejeita quando só hora_fim é informada (falta hora_inicio)", () => {
    const result = treinoSchema.safeParse({ data_treino: "2026-08-20", hora_fim: "19:00" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Informe hora início e hora fim juntas, ou deixe as duas em branco",
      );
    }
  });

  it("rejeita quando hora_fim não é depois de hora_inicio", () => {
    const result = treinoSchema.safeParse({
      data_treino: "2026-08-20",
      hora_inicio: "19:00",
      hora_fim: "18:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hora fim deve ser depois da hora início");
    }
  });

  it("rejeita quando hora_fim é igual a hora_inicio", () => {
    const result = treinoSchema.safeParse({
      data_treino: "2026-08-20",
      hora_inicio: "19:00",
      hora_fim: "19:00",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Hora fim deve ser depois da hora início");
    }
  });

  it("aceita observacao dentro do limite de 500 caracteres", () => {
    const result = treinoSchema.safeParse({ data_treino: "2026-08-20", observacao: "a".repeat(500) });
    expect(result.success).toBe(true);
  });

  it("rejeita observacao maior que 500 caracteres", () => {
    const result = treinoSchema.safeParse({ data_treino: "2026-08-20", observacao: "a".repeat(501) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Observação muito longa");
    }
  });

  it("transforma hora_inicio/hora_fim vazias para undefined", () => {
    const result = treinoSchema.safeParse({ data_treino: "2026-08-20", hora_inicio: "", hora_fim: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hora_inicio).toBeUndefined();
      expect(result.data.hora_fim).toBeUndefined();
    }
  });
});
