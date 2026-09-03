import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { useSession } from "./use-session";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useSession", () => {
  it("expõe a sessão e isAuthenticated=true quando o BFF devolve uma sessão", async () => {
    const session = { userId: "u1", email: "joao@realtpm.app", perfil: "ADMIN", accessExpiresAt: "2026-01-01T00:00:00Z" };
    mockFetch(200, { session });

    const { result } = renderHook(() => useSession(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toEqual(session);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("expõe session=null e isAuthenticated=false quando não há sessão (401)", async () => {
    const jsonSpy = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401, json: jsonSpy }));

    const { result } = renderHook(() => useSession(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.session).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("lança erro fora de um QueryClientProvider", () => {
    expect(() => {
      renderHook(() => useSession());
    }).toThrow(/no queryclient set/i);
  });
});
