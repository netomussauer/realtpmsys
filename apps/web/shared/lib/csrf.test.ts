import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./csrf";

function req(method: string, headers: Record<string, string> = {}) {
  return { method, headers: new Headers(headers) };
}

describe("isSameOriginRequest", () => {
  it.each(["GET", "HEAD", "OPTIONS"])("%s nunca é bloqueado (não muda estado)", (m) => {
    expect(isSameOriginRequest(req(m, { "sec-fetch-site": "cross-site" }))).toBe(true);
  });

  describe("Sec-Fetch-Site", () => {
    it.each(["same-origin", "none"])("aceita %s", (v) => {
      expect(isSameOriginRequest(req("POST", { "sec-fetch-site": v }))).toBe(true);
    });

    it.each(["same-site", "cross-site"])(
      "recusa %s (inclusive same-site: outra porta no mesmo host)",
      (v) => {
        expect(isSameOriginRequest(req("POST", { "sec-fetch-site": v }))).toBe(false);
        expect(isSameOriginRequest(req("PATCH", { "sec-fetch-site": v }))).toBe(false);
        expect(isSameOriginRequest(req("DELETE", { "sec-fetch-site": v }))).toBe(false);
      },
    );

    it("tem precedência sobre um Origin aparentemente válido", () => {
      const r = req("POST", {
        "sec-fetch-site": "same-site",
        origin: "http://app.realtpmsys.local",
        host: "app.realtpmsys.local",
      });
      expect(isSameOriginRequest(r)).toBe(false);
    });
  });

  describe("fallback por Origin (sem Sec-Fetch-Site)", () => {
    it("aceita quando o host do Origin é o do servidor", () => {
      const r = req("POST", { origin: "http://app.realtpmsys.local", host: "app.realtpmsys.local" });
      expect(isSameOriginRequest(r)).toBe(true);
    });

    it("recusa quando o Origin é de outro host", () => {
      const r = req("POST", { origin: "http://evil.example", host: "app.realtpmsys.local" });
      expect(isSameOriginRequest(r)).toBe(false);
    });

    it("recusa o mesmo host em OUTRA porta (host inclui a porta)", () => {
      const r = req("POST", { origin: "http://192.168.1.211:3000", host: "192.168.1.211" });
      expect(isSameOriginRequest(r)).toBe(false);
    });

    it("recusa Origin: null", () => {
      expect(isSameOriginRequest(req("POST", { origin: "null", host: "app.realtpmsys.local" }))).toBe(false);
    });

    it("recusa Origin malformado", () => {
      expect(isSameOriginRequest(req("POST", { origin: "isto não é url", host: "app.realtpmsys.local" }))).toBe(false);
    });

    it("recusa quando há Origin mas não há Host para comparar", () => {
      expect(isSameOriginRequest(req("POST", { origin: "http://app.realtpmsys.local" }))).toBe(false);
    });

    it("prefere X-Forwarded-Host ao Host (atrás de proxy)", () => {
      const r = req("POST", {
        origin: "https://app.exemplo.com",
        host: "10.0.0.5:3000",
        "x-forwarded-host": "app.exemplo.com",
      });
      expect(isSameOriginRequest(r)).toBe(true);
    });
  });

  it("cliente não-navegador (sem Sec-Fetch-Site nem Origin) é aceito", () => {
    expect(isSameOriginRequest(req("POST"))).toBe(true);
  });
});
