import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTestQueryClient, QueryWrapper } from "@/shared/test-utils/setup-query";
import { atletaService } from "@/features/atletas/services/atleta.service";
import {
  useCadastrarAtleta,
  useAtualizarAtleta,
  useMudarStatusAtleta,
  useRemoverAtleta,
  useAdicionarResponsavel,
  useSetUniforme,
} from "./use-mutations";

vi.mock("@/features/atletas/services/atleta.service");

function renderWithClient<T>(hook: () => T) {
  const client = createTestQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryWrapper client={client}>{children}</QueryWrapper>
  );
  return { ...renderHook(hook, { wrapper }), client };
}

describe("useCadastrarAtleta", () => {
  it("chama atletaService.cadastrar e invalida a lista ao ter sucesso", async () => {
    const atleta = { id: "a1", nome: "João" } as never;
    vi.mocked(atletaService.cadastrar).mockResolvedValue(atleta);
    const { result, client } = renderWithClient(() => useCadastrarAtleta());
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    result.current.mutate({ nome: "João", data_nascimento: "2010-05-20" } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(atletaService.cadastrar).toHaveBeenCalledWith({ nome: "João", data_nascimento: "2010-05-20" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["atletas", "list"] });
  });

  it("expõe isError quando o serviço rejeita", async () => {
    vi.mocked(atletaService.cadastrar).mockRejectedValue(new Error("CPF já cadastrado"));
    const { result } = renderWithClient(() => useCadastrarAtleta());

    result.current.mutate({ nome: "João", data_nascimento: "2010-05-20" } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("CPF já cadastrado");
  });
});

describe("useAtualizarAtleta", () => {
  it("atualiza o cache do detail e invalida a lista ao ter sucesso", async () => {
    const atualizado = { id: "a1", nome: "João Editado" } as never;
    vi.mocked(atletaService.atualizar).mockResolvedValue(atualizado);
    const { result, client } = renderWithClient(() => useAtualizarAtleta("a1"));
    const setQueryDataSpy = vi.spyOn(client, "setQueryData");
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    result.current.mutate({ nome: "João Editado", data_nascimento: "2010-05-20" } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(atletaService.atualizar).toHaveBeenCalledWith("a1", { nome: "João Editado", data_nascimento: "2010-05-20" });
    expect(setQueryDataSpy).toHaveBeenCalledWith(["atletas", "detail", "a1"], atualizado);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["atletas", "list"] });
  });
});

describe("useMudarStatusAtleta", () => {
  it("invalida detail e list do atleta cuja ação foi executada", async () => {
    vi.mocked(atletaService.mudarStatus).mockResolvedValue({ id: "a1", status: "SUSPENSO" } as never);
    const { result, client } = renderWithClient(() => useMudarStatusAtleta());
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    result.current.mutate({ id: "a1", acao: "suspender" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(atletaService.mudarStatus).toHaveBeenCalledWith("a1", "suspender");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["atletas", "detail", "a1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["atletas", "list"] });
  });
});

describe("useRemoverAtleta", () => {
  it("remove o detail do cache e invalida a lista ao ter sucesso", async () => {
    vi.mocked(atletaService.remover).mockResolvedValue(undefined);
    const { result, client } = renderWithClient(() => useRemoverAtleta());
    const removeSpy = vi.spyOn(client, "removeQueries");
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    result.current.mutate("a1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(atletaService.remover).toHaveBeenCalledWith("a1");
    expect(removeSpy).toHaveBeenCalledWith({ queryKey: ["atletas", "detail", "a1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["atletas", "list"] });
  });
});

describe("useAdicionarResponsavel", () => {
  it("invalida a lista de responsáveis e o detail do atleta ao ter sucesso", async () => {
    vi.mocked(atletaService.adicionarResponsavel).mockResolvedValue({ id: "r1" } as never);
    const { result, client } = renderWithClient(() => useAdicionarResponsavel("a1"));
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const data = { nome: "Maria", telefone: "21999999999", parentesco: "MAE" as const, contato_principal: true };
    result.current.mutate(data);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(atletaService.adicionarResponsavel).toHaveBeenCalledWith("a1", data);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["atletas", "responsaveis", "a1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["atletas", "detail", "a1"] });
  });
});

describe("useSetUniforme", () => {
  it("invalida o uniforme do atleta ao ter sucesso", async () => {
    vi.mocked(atletaService.setUniforme).mockResolvedValue({ id: "u1" } as never);
    const { result, client } = renderWithClient(() => useSetUniforme("a1"));
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");

    const data = { tam_camisa: "M" as const, tam_short: "P" as const, tam_chuteira: "38" };
    result.current.mutate(data);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(atletaService.setUniforme).toHaveBeenCalledWith("a1", data);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["atletas", "uniforme", "a1"] });
  });
});
