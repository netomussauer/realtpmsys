import { describe, expect, it } from "vitest";
import { safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it.each([
    ["/turmas", "/turmas"],
    ["/atletas/123?aba=dados", "/atletas/123?aba=dados"],
    ["/relatorios#topo", "/relatorios#topo"],
    ["/", "/"],
  ])("aceita caminho interno %s", (entrada, esperado) => {
    expect(safeNextPath(entrada)).toBe(esperado);
  });

  it.each([
    ["URL absoluta http", "http://evil.example"],
    ["URL absoluta https", "https://evil.example/login"],
    ["protocolo-relativa", "//evil.example"],
    ["protocolo-relativa com path", "//evil.example/x"],
    ["barra invertida", "/\\evil.example"],
    ["barra invertida no meio", "/ok\\..\\evil"],
    ["esquema javascript", "javascript:alert(1)"],
    ["esquema data", "data:text/html,<script>1</script>"],
    ["sem barra inicial", "evil.example"],
    ["caminho relativo", "turmas"],
    ["com quebra de linha", "/ok\n//evil.example"],
    ["com tab", "/\t/evil.example"],
    ["byte nulo", "/ok\u0000"],
    ["dot-segment que normaliza para //", "/.//evil.example"],
    ["dot-segment duplo que normaliza para //", "/a/..//evil.example"],
    ["ponto-ponto inicial que normaliza para //", "/..//evil.example"],
    ["vários dot-segments", "/././/evil.example/x"],
  ])("rejeita %s e usa o fallback", (_nome, entrada) => {
    expect(safeNextPath(entrada)).toBe("/dashboard");
  });

  it("usa o fallback para null, undefined e vazio", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined)).toBe("/dashboard");
    expect(safeNextPath("")).toBe("/dashboard");
  });

  it("respeita um fallback customizado", () => {
    expect(safeNextPath("https://evil.example", "/minha-conta")).toBe("/minha-conta");
  });

  it("normaliza caminhos com ponto-ponto legítimos sem sair da origem", () => {
    expect(safeNextPath("/a/../b")).toBe("/b");
    expect(safeNextPath("/a/../../b")).toBe("/b");
    expect(safeNextPath("/./turmas")).toBe("/turmas");
  });

  it("nunca devolve algo que comece com // (propriedade)", () => {
    const entradas = ["/.//x", "/a/..//x", "/..//x", "/././/x", "//x", "/ok", "/a/b/../..//x", "/%2f/x"];
    for (const e of entradas) {
      expect(safeNextPath(e).startsWith("//")).toBe(false);
    }
  });
});
