import { describe, expect, it } from "vitest";
import { responsavelSchema } from "./responsavel.schema";

const valido = {
  nome: "Maria da Silva",
  telefone: "21999999999",
  parentesco: "MAE" as const,
};

describe("responsavelSchema", () => {
  it("aceita nome, telefone e parentesco válidos", () => {
    const result = responsavelSchema.safeParse(valido);
    expect(result.success).toBe(true);
  });

  it("aplica contato_principal=true por default quando omitido", () => {
    const result = responsavelSchema.safeParse(valido);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contato_principal).toBe(true);
    }
  });

  it("aceita contato_principal=false explícito", () => {
    const result = responsavelSchema.safeParse({ ...valido, contato_principal: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.contato_principal).toBe(false);
    }
  });

  it("normaliza cpf e email vazios (\"\") para undefined", () => {
    const result = responsavelSchema.safeParse({ ...valido, cpf: "", email: "" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.cpf).toBeUndefined();
      expect(result.data.email).toBeUndefined();
    }
  });

  it("rejeita nome com menos de 3 caracteres", () => {
    const result = responsavelSchema.safeParse({ ...valido, nome: "Jo" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Nome deve ter ao menos 3 caracteres");
    }
  });

  it("rejeita telefone com menos de 8 caracteres", () => {
    const result = responsavelSchema.safeParse({ ...valido, telefone: "12345" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Telefone incompleto");
    }
  });

  it("rejeita parentesco fora do enum permitido", () => {
    const result = responsavelSchema.safeParse({ ...valido, parentesco: "TIO" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Selecione o parentesco");
    }
  });

  it("rejeita CPF que não tenha 11 dígitos", () => {
    const result = responsavelSchema.safeParse({ ...valido, cpf: "123" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("CPF deve ter 11 dígitos");
    }
  });

  it("rejeita email em formato inválido", () => {
    const result = responsavelSchema.safeParse({ ...valido, email: "nao-e-email" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Email inválido");
    }
  });
});
