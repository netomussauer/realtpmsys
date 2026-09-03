import { describe, expect, it } from "vitest";
import { frequenciaLoteSchema, registroFrequenciaSchema } from "./frequencia.schema";

describe("registroFrequenciaSchema", () => {
  it("aceita PRESENTE sem justificativa", () => {
    const result = registroFrequenciaSchema.safeParse({
      atleta_id: "123e4567-e89b-12d3-a456-426614174000",
      presenca: "PRESENTE",
    });
    expect(result.success).toBe(true);
  });

  it("aceita AUSENTE sem justificativa", () => {
    const result = registroFrequenciaSchema.safeParse({
      atleta_id: "123e4567-e89b-12d3-a456-426614174000",
      presenca: "AUSENTE",
    });
    expect(result.success).toBe(true);
  });

  it("aceita JUSTIFICADO com justificativa preenchida", () => {
    const result = registroFrequenciaSchema.safeParse({
      atleta_id: "123e4567-e89b-12d3-a456-426614174000",
      presenca: "JUSTIFICADO",
      justificativa: "Atestado médico",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita JUSTIFICADO sem justificativa (regra espelhada do backend)", () => {
    const result = registroFrequenciaSchema.safeParse({
      atleta_id: "123e4567-e89b-12d3-a456-426614174000",
      presenca: "JUSTIFICADO",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(
        "Justificativa é obrigatória quando a presença é Justificado",
      );
      expect(result.error.issues[0].path).toEqual(["justificativa"]);
    }
  });

  it("rejeita JUSTIFICADO com justificativa vazia", () => {
    const result = registroFrequenciaSchema.safeParse({
      atleta_id: "123e4567-e89b-12d3-a456-426614174000",
      presenca: "JUSTIFICADO",
      justificativa: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["justificativa"]);
    }
  });

  it("rejeita atleta_id que não é um uuid", () => {
    const result = registroFrequenciaSchema.safeParse({ atleta_id: "nao-e-uuid", presenca: "PRESENTE" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Atleta inválido");
    }
  });

  it("rejeita presenca fora do enum aceito", () => {
    const result = registroFrequenciaSchema.safeParse({
      atleta_id: "123e4567-e89b-12d3-a456-426614174000",
      presenca: "ATRASADO",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita justificativa maior que 300 caracteres", () => {
    const result = registroFrequenciaSchema.safeParse({
      atleta_id: "123e4567-e89b-12d3-a456-426614174000",
      presenca: "JUSTIFICADO",
      justificativa: "a".repeat(301),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Justificativa muito longa");
    }
  });
});

describe("frequenciaLoteSchema", () => {
  it("aceita uma lista com ao menos 1 registro válido", () => {
    const result = frequenciaLoteSchema.safeParse({
      registros: [{ atleta_id: "123e4567-e89b-12d3-a456-426614174000", presenca: "PRESENTE" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejeita lista vazia de registros", () => {
    const result = frequenciaLoteSchema.safeParse({ registros: [] });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nenhum atleta matriculado para lançar frequência");
    }
  });

  it("propaga erro de um registro individual inválido dentro do array", () => {
    const result = frequenciaLoteSchema.safeParse({
      registros: [
        { atleta_id: "123e4567-e89b-12d3-a456-426614174000", presenca: "JUSTIFICADO" },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(["registros", 0, "justificativa"]);
    }
  });
});
