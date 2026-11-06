import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SenhaTemporariaBox } from "./senha-temporaria-box";

function renderBox(onConcluir = vi.fn()) {
  render(
    <SenhaTemporariaBox titulo="Conta criada" email="ana@example.com" senha="Abc123xyz9" onConcluir={onConcluir} />,
  );
  return onConcluir;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SenhaTemporariaBox", () => {
  it("exibe título, e-mail do destinatário, a senha e o aviso de exibição única", () => {
    renderBox();

    expect(screen.getByRole("heading", { name: "Conta criada" })).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByTestId("senha-temporaria")).toHaveTextContent("Abc123xyz9");
    expect(screen.getByText(/não será exibida novamente/i)).toBeInTheDocument();
  });

  it("copia a senha para a área de transferência e confirma", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    // user-event instala seu próprio clipboard; sobrescrevemos para observar a chamada.
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    renderBox();

    await user.click(screen.getByRole("button", { name: /copiar/i }));

    expect(writeText).toHaveBeenCalledWith("Abc123xyz9");
    expect(await screen.findByRole("button", { name: /copiada/i })).toBeInTheDocument();
  });

  it("avisa para copiar manualmente quando o clipboard falha", async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("negado")) },
      configurable: true,
    });
    renderBox();

    await user.click(screen.getByRole("button", { name: /copiar/i }));

    expect(await screen.findByText(/copie manualmente/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /copiada/i })).not.toBeInTheDocument();
  });

  it("chama onConcluir ao clicar no botão de conclusão", async () => {
    const user = userEvent.setup();
    const onConcluir = renderBox();

    await user.click(screen.getByRole("button", { name: "Concluir" }));

    expect(onConcluir).toHaveBeenCalledTimes(1);
  });
});
