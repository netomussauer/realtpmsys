import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSession } from "./use-session";
import { usePermission } from "./use-permission";

vi.mock("./use-session");

const mockedUseSession = vi.mocked(useSession);

function mockSession(session: ReturnType<typeof useSession>["session"]) {
  mockedUseSession.mockReturnValue({
    session,
    isLoading: false,
    isAuthenticated: !!session,
    refetch: vi.fn() as unknown as ReturnType<typeof useSession>["refetch"],
  });
}

describe("usePermission", () => {
  it("devolve false quando não há sessão", () => {
    mockSession(null);

    const { result } = renderHook(() => usePermission(["ADMIN"]));

    expect(result.current).toBe(false);
  });

  it("devolve true quando o perfil da sessão está na lista permitida", () => {
    mockSession({ userId: "u1", email: "x@y.com", perfil: "TREINADOR", accessExpiresAt: "2026-01-01T00:00:00Z" });

    const { result } = renderHook(() => usePermission(["ADMIN", "TREINADOR"]));

    expect(result.current).toBe(true);
  });

  it("devolve false quando o perfil da sessão não está na lista permitida", () => {
    mockSession({ userId: "u1", email: "x@y.com", perfil: "RESPONSAVEL", accessExpiresAt: "2026-01-01T00:00:00Z" });

    const { result } = renderHook(() => usePermission(["ADMIN", "TREINADOR"]));

    expect(result.current).toBe(false);
  });

  it("devolve false quando a lista de perfis permitidos está vazia", () => {
    mockSession({ userId: "u1", email: "x@y.com", perfil: "ADMIN", accessExpiresAt: "2026-01-01T00:00:00Z" });

    const { result } = renderHook(() => usePermission([]));

    expect(result.current).toBe(false);
  });
});
