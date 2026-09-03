import { describe, expect, it } from "vitest";
import { uniformeSchema } from "./uniforme.schema";

const valido = {
  tam_camisa: "M" as const,
  tam_short: "P" as const,
  tam_chuteira: "38",
};

describe("uniformeSchema", () => {
  it("aceita tamanhos válidos", () => {
    const result = uniformeSchema.safeParse(valido);
    expect(result.success).toBe(true);
  });

  it("rejeita tam_camisa fora do enum permitido", () => {
    const result = uniformeSchema.safeParse({ ...valido, tam_camisa: "XL" });
    expect(result.success).toBe(false);
  });

  it("rejeita tam_short fora do enum permitido", () => {
    const result = uniformeSchema.safeParse({ ...valido, tam_short: "XL" });
    expect(result.success).toBe(false);
  });

  it("rejeita tam_chuteira que não seja número de 2 dígitos", () => {
    const result = uniformeSchema.safeParse({ ...valido, tam_chuteira: "9" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Tamanho da chuteira: número de 2 dígitos");
    }
  });

  it("rejeita tam_chuteira não numérico", () => {
    const result = uniformeSchema.safeParse({ ...valido, tam_chuteira: "ab" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Tamanho da chuteira: número de 2 dígitos");
    }
  });

  it("rejeita quando campos obrigatórios estão ausentes", () => {
    const result = uniformeSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
