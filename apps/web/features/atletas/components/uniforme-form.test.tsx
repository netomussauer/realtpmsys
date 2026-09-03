import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { UniformeForm } from "./uniforme-form";

const LABELS: Record<string, RegExp> = {
  tam_camisa: /camisa/i,
  tam_short: /short/i,
  tam_chuteira: /chuteira/i,
};

function field(_container: HTMLElement, name: string) {
  return screen.getByLabelText(LABELS[name] ?? name, { selector: "input,select,textarea" }) as HTMLElement;
}

async function preencherObrigatorios(_container: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(field(_container, "tam_camisa"), "M");
  await user.selectOptions(field(_container, "tam_short"), "P");
  await user.type(field(_container, "tam_chuteira"), "38");
}

describe("UniformeForm", () => {
  it("não chama onSubmit quando os selects obrigatórios (camisa/short) não são preenchidos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<UniformeForm onSubmit={onSubmit} />);

    await user.type(field(container, "tam_chuteira"), "38");
    await user.click(screen.getByRole("button", { name: /salvar uniforme/i }));

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /salvar uniforme/i })).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exibe erro de validação quando o tamanho da chuteira não é número de 2 dígitos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<UniformeForm onSubmit={onSubmit} />);

    await user.selectOptions(field(container, "tam_camisa"), "M");
    await user.selectOptions(field(container, "tam_short"), "P");
    await user.type(field(container, "tam_chuteira"), "9");
    await user.click(screen.getByRole("button", { name: /salvar uniforme/i }));

    expect(await screen.findByText("Tamanho da chuteira: número de 2 dígitos")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("chama onSubmit com os dados do formulário quando válido", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<UniformeForm onSubmit={onSubmit} />);

    await preencherObrigatorios(container, user);
    await user.click(screen.getByRole("button", { name: /salvar uniforme/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [data] = onSubmit.mock.calls[0];
    expect(data).toEqual({ tam_camisa: "M", tam_short: "P", tam_chuteira: "38" });
  });

  it("exibe a mensagem de erro do servidor quando serverError é passado", () => {
    render(<UniformeForm onSubmit={vi.fn()} serverError="Uniforme já cadastrado" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Uniforme já cadastrado");
  });

  it("desabilita o botão de submit e mostra 'Salvando...' quando isSubmitting", () => {
    render(<UniformeForm onSubmit={vi.fn()} isSubmitting />);
    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
  });

  it("chama onSkip quando o botão Pular é clicado, sem chamar onSubmit", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    const onSubmit = vi.fn();
    render(<UniformeForm onSubmit={onSubmit} onSkip={onSkip} />);

    await user.click(screen.getByRole("button", { name: /pular/i }));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
