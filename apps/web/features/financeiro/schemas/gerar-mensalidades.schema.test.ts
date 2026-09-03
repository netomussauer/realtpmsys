import { describe, expect, it } from "vitest";
import { gerarMensalidadesSchema } from "./gerar-mensalidades.schema";

describe("gerarMensalidadesSchema", () => {
  it("aceita ano e mês válidos", () => {
    const result = gerarMensalidadesSchema.safeParse({ competencia_ano: 2026, competencia_mes: 8 });
    expect(result.success).toBe(true);
  });

  it("rejeita quando o ano está ausente", () => {
    const result = gerarMensalidadesSchema.safeParse({ competencia_mes: 8 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Informe o ano");
    }
  });

  it("rejeita ano não inteiro", () => {
    const result = gerarMensalidadesSchema.safeParse({ competencia_ano: 2020.5, competencia_mes: 8 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Ano deve ser um número inteiro");
    }
  });

  it("rejeita ano abaixo de 2020", () => {
    const result = gerarMensalidadesSchema.safeParse({ competencia_ano: 2019, competencia_mes: 8 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Ano inválido");
    }
  });

  it("rejeita ano acima de 2100", () => {
    const result = gerarMensalidadesSchema.safeParse({ competencia_ano: 2101, competencia_mes: 8 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Ano inválido");
    }
  });

  it("rejeita quando o mês está ausente", () => {
    const result = gerarMensalidadesSchema.safeParse({ competencia_ano: 2026 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Informe o mês");
    }
  });

  it("rejeita mês abaixo de 1", () => {
    const result = gerarMensalidadesSchema.safeParse({ competencia_ano: 2026, competencia_mes: 0 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Mês deve ser entre 1 e 12");
    }
  });

  it("rejeita mês acima de 12", () => {
    const result = gerarMensalidadesSchema.safeParse({ competencia_ano: 2026, competencia_mes: 13 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Mês deve ser entre 1 e 12");
    }
  });
});
