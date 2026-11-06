import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { authService } from "@/features/auth/services/auth.service";
import { TrocarSenhaForm } from "./trocar-senha-form";

vi.mock("@/features/auth/services/auth.service");

const { mockedPush, mockedRefresh } = vi.hoisted(() => ({
  mockedPush: vi.fn(),
  mockedRefresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockedPush, refresh: mockedRefresh }),
}));

const mockedTrocar = vi.mocked(authService.trocarSenha);

async function preencher(
  user: ReturnType<typeof userEvent.setup>,
  { atual = "senhaAtual123", nova = "outraSenha456", confirmar = nova }: {
    atual?: string;
    nova?: string;
    confirmar?: string;
  } = {},
) {
  await user.type(screen.getByLabelText(/^senha atual/i), atual);
  await user.type(screen.getByLabelText(/^nova senha/i), nova);
  await user.type(screen.getByLabelText(/confirmar nova senha/i), confirmar);
}

function renderForm(props: { obrigatoria?: boolean } = {}) {
  return render(<TrocarSenhaForm {...props} />, { wrapper: QueryWrapper });
}

describe("TrocarSenhaForm", () => {
  beforeEach(() => {
    mockedTrocar.mockReset();
    mockedPush.mockReset();
    mockedRefresh.mockReset();
  });

  it("envia a senha atual e a nova (sem a confirmação) ao serviço", async () => {
    const user = userEvent.setup();
    mockedTrocar.mockResolvedValue(undefined);
    renderForm();

    await preencher(user);
    await user.click(screen.getByRole("button", { name: /alterar senha/i }));

    await screen.findByRole("status");
    expect(mockedTrocar).toHaveBeenCalledWith({ senhaAtual: "senhaAtual123", novaSenha: "outraSenha456" });
  });

  it("troca voluntária: permanece na página, confirma e limpa os campos", async () => {
    const user = userEvent.setup();
    mockedTrocar.mockResolvedValue(undefined);
    renderForm();

    await preencher(user);
    await user.click(screen.getByRole("button", { name: /alterar senha/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/senha alterada/i);
    expect(mockedPush).not.toHaveBeenCalled();
    expect(screen.getByLabelText(/^senha atual/i)).toHaveValue("");
  });

  it("troca obrigatória: segue para o dashboard ao concluir", async () => {
    const user = userEvent.setup();
    mockedTrocar.mockResolvedValue(undefined);
    renderForm({ obrigatoria: true });

    await preencher(user);
    await user.click(screen.getByRole("button", { name: /alterar senha/i }));

    await vi.waitFor(() => expect(mockedPush).toHaveBeenCalledWith("/dashboard"));
    expect(mockedRefresh).toHaveBeenCalled();
  });

  it("valida a política no cliente e não chama o serviço", async () => {
    const user = userEvent.setup();
    renderForm();

    await preencher(user, { nova: "curta1" });
    await user.click(screen.getByRole("button", { name: /alterar senha/i }));

    expect(await screen.findByText(/ao menos 10 caracteres/i)).toBeInTheDocument();
    expect(mockedTrocar).not.toHaveBeenCalled();
  });

  it("recusa confirmação diferente", async () => {
    const user = userEvent.setup();
    renderForm();

    await preencher(user, { nova: "outraSenha456", confirmar: "diferente789" });
    await user.click(screen.getByRole("button", { name: /alterar senha/i }));

    expect(await screen.findByText(/confirmação não confere/i)).toBeInTheDocument();
    expect(mockedTrocar).not.toHaveBeenCalled();
  });

  it("exibe o erro do servidor (ex.: senha atual incorreta) e não navega", async () => {
    const user = userEvent.setup();
    mockedTrocar.mockRejectedValue(new Error("senha atual incorreta"));
    renderForm({ obrigatoria: true });

    await preencher(user);
    await user.click(screen.getByRole("button", { name: /alterar senha/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("senha atual incorreta");
    expect(mockedPush).not.toHaveBeenCalled();
  });
});
