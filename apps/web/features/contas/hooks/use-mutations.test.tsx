import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTestQueryClient, QueryWrapper } from "@/shared/test-utils/setup-query";
import { contaService } from "@/features/contas/services/conta.service";
import {
  useAtualizarConta,
  useCriarConta,
  useMudarStatusConta,
  useRedefinirSenhaConta,
} from "./use-mutations";

vi.mock("@/features/contas/services/conta.service");

const mockedCriar = vi.mocked(contaService.criar);
const mockedAtualizar = vi.mocked(contaService.atualizar);
const mockedMudarStatus = vi.mocked(contaService.mudarStatus);
const mockedRedefinir = vi.mocked(contaService.redefinirSenha);

function wrapperWithClient(client: ReturnType<typeof createTestQueryClient>) {
  return ({ children }: { children: ReactNode }) => <QueryWrapper client={client}>{children}</QueryWrapper>;
}

describe("useCriarConta", () => {
  it("invalida a lista e devolve a senha temporária SEM guardá-la no cache", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    mockedCriar.mockResolvedValue({ id: "u1", senha_temporaria: "Abc123xyz9" } as never);

    const { result } = renderHook(() => useCriarConta(), { wrapper: wrapperWithClient(client) });
    const r = await result.current.mutateAsync({ email: "a@b.co", nome: "", perfil: "ADMIN" });

    expect(r.senha_temporaria).toBe("Abc123xyz9");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contas", "list"] });
    expect(JSON.stringify(client.getQueryCache().getAll().map((q) => q.state.data))).not.toContain("Abc123xyz9");
  });
});

describe("useAtualizarConta", () => {
  it("atualiza o detalhe no cache e invalida a lista", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    mockedAtualizar.mockResolvedValue({ id: "u1", nome: "Novo" } as never);

    const { result } = renderHook(() => useAtualizarConta("u1"), { wrapper: wrapperWithClient(client) });
    await result.current.mutateAsync({ nome: "Novo", perfil: "ADMIN" });

    expect(mockedAtualizar).toHaveBeenCalledWith("u1", { nome: "Novo", perfil: "ADMIN" });
    expect(client.getQueryData(["contas", "detail", "u1"])).toEqual({ id: "u1", nome: "Novo" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contas", "list"] });
  });
});

describe("useMudarStatusConta", () => {
  it("chama o serviço com id e ação, atualiza o detalhe e invalida a lista", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    mockedMudarStatus.mockResolvedValue({ id: "u1", ativo: false } as never);

    const { result } = renderHook(() => useMudarStatusConta(), { wrapper: wrapperWithClient(client) });
    await result.current.mutateAsync({ id: "u1", acao: "desativar" });

    expect(mockedMudarStatus).toHaveBeenCalledWith("u1", "desativar");
    expect(client.getQueryData(["contas", "detail", "u1"])).toEqual({ id: "u1", ativo: false });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contas", "list"] });
  });

  it("expõe o erro do backend (ex.: último admin)", async () => {
    mockedMudarStatus.mockRejectedValue(new Error("deixaria o sistema sem administrador"));
    const { result } = renderHook(() => useMudarStatusConta(), { wrapper: QueryWrapper });

    result.current.mutate({ id: "u1", acao: "desativar" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain("sem administrador");
  });
});

describe("useRedefinirSenhaConta", () => {
  it("devolve a senha temporária, invalida detalhe e lista, e não a cacheia", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    mockedRedefinir.mockResolvedValue({ id: "u1", senha_temporaria: "Nova123abc" } as never);

    const { result } = renderHook(() => useRedefinirSenhaConta(), { wrapper: wrapperWithClient(client) });
    const r = await result.current.mutateAsync("u1");

    expect(r.senha_temporaria).toBe("Nova123abc");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contas", "detail", "u1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["contas", "list"] });
    expect(JSON.stringify(client.getQueryCache().getAll().map((q) => q.state.data))).not.toContain("Nova123abc");
  });
});
