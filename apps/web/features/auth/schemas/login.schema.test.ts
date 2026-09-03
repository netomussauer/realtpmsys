import { describe, expect, it } from "vitest";
import { loginSchema } from "./login.schema";

describe("loginSchema", () => {
  it("aceita email e senha válidos", () => {
    const result = loginSchema.safeParse({ email: "joao@realtpm.app", senha: "qualquercoisa" });
    expect(result.success).toBe(true);
  });

  it("rejeita email vazio", () => {
    const result = loginSchema.safeParse({ email: "", senha: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Informe seu email");
    }
  });

  it("rejeita email em formato inválido", () => {
    const result = loginSchema.safeParse({ email: "nao-e-email", senha: "x" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Email inválido");
    }
  });

  it("rejeita senha vazia", () => {
    const result = loginSchema.safeParse({ email: "joao@realtpm.app", senha: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe("Informe sua senha");
    }
  });
});
