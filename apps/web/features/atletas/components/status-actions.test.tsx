import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useMudarStatusAtleta } from "@/features/atletas/hooks/use-mutations";
import { StatusActions } from "./status-actions";

vi.mock("@/features/atletas/hooks/use-mutations");

const mockedUseMudarStatusAtleta = vi.mocked(useMudarStatusAtleta);

function mockMutation(overrides: Partial<ReturnType<typeof useMudarStatusAtleta>> = {}) {
  const mutate = vi.fn();
  mockedUseMudarStatusAtleta.mockReturnValue({
    mutate,
    isPending: false,
    ...overrides,
  } as unknown as ReturnType<typeof useMudarStatusAtleta>);
  return mutate;
}

describe("StatusActions", () => {
  beforeEach(() => {
    vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    vi.mocked(window.confirm).mockRestore();
  });

  it("para status ATIVO mostra Suspender e Inativar, mas não Reativar", () => {
    mockMutation();
    render(<StatusActions atletaId="a1" statusAtual="ATIVO" />);

    expect(screen.getByRole("button", { name: /suspender/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /inativar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reativar/i })).not.toBeInTheDocument();
  });

  it("para status SUSPENSO mostra Reativar e Inativar, mas não Suspender", () => {
    mockMutation();
    render(<StatusActions atletaId="a1" statusAtual="SUSPENSO" />);

    expect(screen.getByRole("button", { name: /reativar/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /inativar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /suspender/i })).not.toBeInTheDocument();
  });

  it("para status INATIVO mostra apenas Reativar", () => {
    mockMutation();
    render(<StatusActions atletaId="a1" statusAtual="INATIVO" />);

    expect(screen.getByRole("button", { name: /reativar/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^suspender$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /inativar/i })).not.toBeInTheDocument();
  });

  it("chama mutate com a ação correta quando o usuário confirma", async () => {
    const mutate = mockMutation();
    vi.mocked(window.confirm).mockReturnValue(true);
    const user = userEvent.setup();
    render(<StatusActions atletaId="a1" statusAtual="ATIVO" />);

    await user.click(screen.getByRole("button", { name: /suspender/i }));

    expect(mutate).toHaveBeenCalledWith(
      { id: "a1", acao: "suspender" },
      expect.objectContaining({ onSettled: expect.any(Function) }),
    );
  });

  it("não chama mutate quando o usuário cancela a confirmação", async () => {
    const mutate = mockMutation();
    vi.mocked(window.confirm).mockReturnValue(false);
    const user = userEvent.setup();
    render(<StatusActions atletaId="a1" statusAtual="ATIVO" />);

    await user.click(screen.getByRole("button", { name: /inativar/i }));

    expect(mutate).not.toHaveBeenCalled();
  });

  it("desabilita todos os botões enquanto a mutation está pendente", () => {
    mockMutation({ isPending: true });
    render(<StatusActions atletaId="a1" statusAtual="ATIVO" />);

    expect(screen.getByRole("button", { name: /suspender/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /inativar/i })).toBeDisabled();
  });
});
