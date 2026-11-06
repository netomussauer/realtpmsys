import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { useMudarStatusConta, useRedefinirSenhaConta } from "@/features/contas/hooks/use-mutations";
import type { ContaDTO } from "@/features/contas/types/conta.types";
import { ContaAcoes } from "./conta-acoes";

vi.mock("@/features/contas/hooks/use-mutations");

const mockedStatus = vi.mocked(useMudarStatusConta);
const mockedRedefinir = vi.mocked(useRedefinirSenhaConta);

const conta: ContaDTO = {
  id: "u1",
  email: "ana@example.com",
  nome: "Ana",
  perfil: "TREINADOR",
  ativo: true,
  deve_trocar_senha: false,
  criado_em: "2026-01-01T00:00:00Z",
  atualizado_em: "2026-01-01T00:00:00Z",
};

function mockMutations(opts: { statusPending?: boolean; redefinirPending?: boolean } = {}) {
  const statusMutate = vi.fn();
  const redefinirMutate = vi.fn();
  mockedStatus.mockReturnValue({
    mutate: statusMutate,
    isPending: opts.statusPending ?? false,
  } as unknown as ReturnType<typeof useMudarStatusConta>);
  mockedRedefinir.mockReturnValue({
    mutate: redefinirMutate,
    isPending: opts.redefinirPending ?? false,
  } as unknown as ReturnType<typeof useRedefinirSenhaConta>);
  return { statusMutate, redefinirMutate };
}

describe("ContaAcoes", () => {
  let confirmSpy: MockInstance;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, "confirm");
  });
  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it("conta ativa: oferece Desativar e Redefinir senha (não Reativar)", () => {
    mockMutations();
    render(<ContaAcoes conta={conta} ehContaPropria={false} />);

    expect(screen.getByRole("button", { name: /desativar conta/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /redefinir senha/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reativar/i })).not.toBeInTheDocument();
  });

  it("conta inativa: oferece Reativar (não Desativar)", () => {
    mockMutations();
    render(<ContaAcoes conta={{ ...conta, ativo: false }} ehContaPropria={false} />);

    expect(screen.getByRole("button", { name: /reativar conta/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /desativar conta/i })).not.toBeInTheDocument();
  });

  it("conta própria: sem desativar/redefinir, com orientação para 'Minha conta'", () => {
    mockMutations();
    render(<ContaAcoes conta={conta} ehContaPropria />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/esta é a sua conta/i)).toBeInTheDocument();
  });

  it("desativar: confirma e chama a mutation com a ação correta", async () => {
    const user = userEvent.setup();
    const { statusMutate } = mockMutations();
    confirmSpy.mockReturnValue(true);
    render(<ContaAcoes conta={conta} ehContaPropria={false} />);

    await user.click(screen.getByRole("button", { name: /desativar conta/i }));

    expect(confirmSpy).toHaveBeenCalledWith(expect.stringContaining("ana@example.com"));
    expect(statusMutate).toHaveBeenCalledWith({ id: "u1", acao: "desativar" }, expect.any(Object));
  });

  it("desativar: não faz nada se o usuário cancelar a confirmação", async () => {
    const user = userEvent.setup();
    const { statusMutate } = mockMutations();
    confirmSpy.mockReturnValue(false);
    render(<ContaAcoes conta={conta} ehContaPropria={false} />);

    await user.click(screen.getByRole("button", { name: /desativar conta/i }));

    expect(statusMutate).not.toHaveBeenCalled();
  });

  it("redefinir: após o sucesso exibe a senha temporária uma vez e permite concluir", async () => {
    const user = userEvent.setup();
    const { redefinirMutate } = mockMutations();
    confirmSpy.mockReturnValue(true);
    redefinirMutate.mockImplementation((_id: string, cbs: { onSuccess: (r: unknown) => void }) =>
      cbs.onSuccess({ senha_temporaria: "Nova123abc" }),
    );
    render(<ContaAcoes conta={conta} ehContaPropria={false} />);

    await user.click(screen.getByRole("button", { name: /redefinir senha/i }));

    expect(redefinirMutate).toHaveBeenCalledWith("u1", expect.any(Object));
    expect(screen.getByTestId("senha-temporaria")).toHaveTextContent("Nova123abc");

    await user.click(screen.getByRole("button", { name: "Concluir" }));

    expect(screen.queryByTestId("senha-temporaria")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /redefinir senha/i })).toBeInTheDocument();
  });

  it("mostra o erro do backend quando a ação falha", async () => {
    const user = userEvent.setup();
    const { statusMutate } = mockMutations();
    confirmSpy.mockReturnValue(true);
    statusMutate.mockImplementation((_v: unknown, cbs: { onError: (e: Error) => void }) =>
      cbs.onError(new Error("operação deixaria o sistema sem nenhum administrador ativo")),
    );
    render(<ContaAcoes conta={{ ...conta, perfil: "ADMIN" }} ehContaPropria={false} />);

    await user.click(screen.getByRole("button", { name: /desativar conta/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/sem nenhum administrador ativo/i);
  });

  it("desabilita os botões enquanto uma mutation está pendente", () => {
    mockMutations({ statusPending: true });
    render(<ContaAcoes conta={conta} ehContaPropria={false} />);

    expect(screen.getByRole("button", { name: /desativando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /redefinir senha/i })).toBeDisabled();
  });
});
