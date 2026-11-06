import { describe, expect, it } from "vitest";
import {
  criarContaSchema,
  editarContaSchema,
  novaSenhaSchema,
  trocarSenhaSchema,
} from "./conta.schema";

describe("criarContaSchema", () => {
  it("aceita e-mail, nome e perfil válidos e apara espaços", () => {
    const r = criarContaSchema.safeParse({ email: "  ana@example.com ", nome: "  Ana  ", perfil: "TREINADOR" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("ana@example.com");
      expect(r.data.nome).toBe("Ana");
    }
  });

  it("aceita nome vazio (contas sem nome são válidas)", () => {
    expect(criarContaSchema.safeParse({ email: "a@b.co", nome: "", perfil: "ADMIN" }).success).toBe(true);
  });

  it.each([
    ["e-mail vazio", { email: "", nome: "", perfil: "ADMIN" }, "Informe o e-mail"],
    ["e-mail inválido", { email: "nao-e-email", nome: "", perfil: "ADMIN" }, "E-mail inválido"],
    ["perfil fora da lista", { email: "a@b.co", nome: "", perfil: "ROOT" }, "Selecione o perfil"],
    ["nome longo demais", { email: "a@b.co", nome: "x".repeat(151), perfil: "ADMIN" }, "Nome muito longo (máx. 150)"],
  ])("rejeita %s", (_nome, input, mensagem) => {
    const r = criarContaSchema.safeParse(input);
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain(mensagem);
  });
});

describe("editarContaSchema", () => {
  it("não aceita e-mail como campo editável (é descartado)", () => {
    const r = editarContaSchema.safeParse({ nome: "Ana", perfil: "ADMIN", email: "outro@x.co" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).not.toHaveProperty("email");
  });

  it("rejeita perfil inválido", () => {
    expect(editarContaSchema.safeParse({ nome: "", perfil: "X" }).success).toBe(false);
  });
});

describe("novaSenhaSchema (espelha ValidarSenha do backend)", () => {
  it.each([
    ["válida", "abcdefghi1", true],
    ["com acentos", "sênhaSegura9", true],
    ["curta (9)", "abcdefgh1", false],
    ["sem dígito", "abcdefghijk", false],
    ["sem letra", "1234567890", false],
    ["72 bytes exatos", "a".repeat(71) + "1", true],
    ["73 bytes", "a".repeat(72) + "1", false],
  ])("%s", (_nome, senha, ok) => {
    expect(novaSenhaSchema.safeParse(senha).success).toBe(ok);
  });

  it("mede o limite em BYTES UTF-8, não em caracteres", () => {
    // 'é' ocupa 2 bytes: 36 × 2 = 72, mais 1 dígito = 73 bytes (mas 37 caracteres).
    const senha = "é".repeat(36) + "1";
    expect(senha.length).toBe(37);
    expect(novaSenhaSchema.safeParse(senha).success).toBe(false);
  });
});

describe("trocarSenhaSchema", () => {
  const ok = { senhaAtual: "senhaAtual123", novaSenha: "outraSenha456", confirmarSenha: "outraSenha456" };

  it("aceita uma troca consistente", () => {
    expect(trocarSenhaSchema.safeParse(ok).success).toBe(true);
  });

  it("exige a senha atual", () => {
    const r = trocarSenhaSchema.safeParse({ ...ok, senhaAtual: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => i.message)).toContain("Informe a senha atual");
  });

  it("recusa confirmação diferente, apontando o campo confirmarSenha", () => {
    const r = trocarSenhaSchema.safeParse({ ...ok, confirmarSenha: "diferente123" });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.message.includes("confirmação"));
      expect(issue?.path).toEqual(["confirmarSenha"]);
    }
  });

  it("recusa nova senha igual à atual, apontando o campo novaSenha", () => {
    const r = trocarSenhaSchema.safeParse({
      senhaAtual: "mesmaSenha123",
      novaSenha: "mesmaSenha123",
      confirmarSenha: "mesmaSenha123",
    });
    expect(r.success).toBe(false);
    if (!r.success) {
      const issue = r.error.issues.find((i) => i.message.includes("diferente da atual"));
      expect(issue?.path).toEqual(["novaSenha"]);
    }
  });

  it("recusa nova senha fraca", () => {
    const r = trocarSenhaSchema.safeParse({ ...ok, novaSenha: "curta1", confirmarSenha: "curta1" });
    expect(r.success).toBe(false);
  });
});
