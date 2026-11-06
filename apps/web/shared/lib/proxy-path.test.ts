import { describe, expect, it } from "vitest";
import { isSafePathSegments } from "./proxy-path";

describe("isSafePathSegments", () => {
  it.each([
    [["atletas"]],
    [["atletas", "3f2b6c1e-8a4d-4c1b-9d57-0a1b2c3d4e5f"]],
    [["usuarios", "abc", "redefinir-senha"]],
    [["mensalidades", "gerar"]],
  ])("aceita %j", (segmentos) => {
    expect(isSafePathSegments(segmentos)).toBe(true);
  });

  it.each([
    ["vazio", []],
    ["segmento vazio", ["atletas", ""]],
    ["ponto", ["atletas", "."]],
    ["ponto-ponto", ["..", "metrics"]],
    ["ponto-ponto no meio", ["atletas", "..", "metrics"]],
    ["barra dentro do segmento", ["atletas/../../metrics"]],
    ["barra invertida", ["atletas\\..\\metrics"]],
    ["query injetada", ["atletas?x=1"]],
    ["fragmento", ["atletas#x"]],
    ["percent residual (dupla codificação)", ["%2e%2e"]],
    ["quebra de linha", ["atletas\nX-Header: 1"]],
    ["byte nulo", ["atletas\u0000"]],
  ])("rejeita %s", (_nome, segmentos) => {
    expect(isSafePathSegments(segmentos as string[])).toBe(false);
  });
});
