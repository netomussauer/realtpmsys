import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { useMudarStatusTurma } from "@/features/turmas/hooks/use-mutations";
import { StatusActions } from "./status-actions";

vi.mock("@/features/turmas/hooks/use-mutations");

const mockedUseMudarStatusTurma = vi.mocked(useMudarStatusTurma);

function mockMutation(overrides: Partial<ReturnType<typeof useMudarStatusTurma>> = {}) {
  const mutate = vi.fn();
  mockedUseMudarStatusTurma.mockReturnValue({
    mutate,
    isPending: false,
    ...overrides,
  } as unknown as ReturnType<typeof useMudarStatusTurma>);
  return mutate;
}

describe("StatusActions", () => {
  let confirmSpy: MockInstance;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it("turma ENCERRADA: não exibe nenhum botão de transição, só a mensagem de estado terminal", () => {
    mockMutation();
    render(<StatusActions turmaId="t1" statusAtual="ENCERRADA" />);

    expect(screen.getByText(/não há mais transições de status disponíveis/i)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("turma ATIVA: exibe os botões Suspender e Encerrar (não Reativar)", () => {
    mockMutation();
    render(<StatusActions turmaId="t1" statusAtual="ATIVA" />);

    expect(screen.getByRole("button", { name: /suspender/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /encerrar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reativar/i })).not.toBeInTheDocument();
  });

  it("turma SUSPENSA: exibe somente o botão Reativar", () => {
    mockMutation();
    render(<StatusActions turmaId="t1" statusAtual="SUSPENSA" />);

    expect(screen.getByRole("button", { name: /reativar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /suspender/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /encerrar/i })).not.toBeInTheDocument();
  });

  it("clicar em Encerrar após confirmar chama a mutation com a ação correta", async () => {
    const mutate = mockMutation();
    confirmSpy.mockReturnValue(true);
    const user = userEvent.setup();
    render(<StatusActions turmaId="t1" statusAtual="ATIVA" />);

    await user.click(screen.getByRole("button", { name: /encerrar/i }));

    expect(confirmSpy).toHaveBeenCalledWith("Encerrar turma? Esta ação é definitiva.");
    expect(mutate).toHaveBeenCalledWith({ id: "t1", acao: "encerrar" }, expect.objectContaining({ onSettled: expect.any(Function) }));
  });

  it("clicar em Suspender e cancelar o confirm NÃO chama a mutation", async () => {
    const mutate = mockMutation();
    confirmSpy.mockReturnValue(false);
    const user = userEvent.setup();
    render(<StatusActions turmaId="t1" statusAtual="ATIVA" />);

    await user.click(screen.getByRole("button", { name: /suspender/i }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it("desabilita os botões enquanto a mutation está pendente", () => {
    mockMutation({ isPending: true });
    render(<StatusActions turmaId="t1" statusAtual="ATIVA" />);

    expect(screen.getByRole("button", { name: /suspender/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /encerrar/i })).toBeDisabled();
  });
});
