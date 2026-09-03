import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ResponsavelForm } from "./responsavel-form";

const LABELS: Record<string, RegExp> = {
  nome: /nome completo/i,
  telefone: /^telefone/i,
  parentesco: /parentesco/i,
  contato_principal: /contato principal/i,
};

function field(_container: HTMLElement, name: string) {
  return screen.getByLabelText(LABELS[name] ?? name, { selector: "input,select,textarea" }) as HTMLElement;
}

async function preencherObrigatorios(_container: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
  await user.type(field(_container, "nome"), "Maria da Silva");
  await user.type(field(_container, "telefone"), "21999999999");
  await user.selectOptions(field(_container, "parentesco"), "MAE");
}

describe("ResponsavelForm", () => {
  it("marca contato_principal como true por padrão", () => {
    const { container } = render(<ResponsavelForm onSubmit={vi.fn()} />);
    expect(field(container, "contato_principal")).toBeChecked();
  });

  it("exibe erro de validação quando o telefone é muito curto", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<ResponsavelForm onSubmit={onSubmit} />);

    await user.type(field(container, "nome"), "Maria da Silva");
    await user.type(field(container, "telefone"), "123");
    await user.selectOptions(field(container, "parentesco"), "MAE");
    await user.click(screen.getByRole("button", { name: /adicionar responsável/i }));

    expect(await screen.findByText("Telefone incompleto")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exibe erro de validação quando o parentesco não é selecionado", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<ResponsavelForm onSubmit={onSubmit} />);

    await user.type(field(container, "nome"), "Maria da Silva");
    await user.type(field(container, "telefone"), "21999999999");
    await user.click(screen.getByRole("button", { name: /adicionar responsável/i }));

    expect(await screen.findByText("Selecione o parentesco")).toBeInTheDocument();
  });

  it("chama onSubmit com os dados do formulário quando válido", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<ResponsavelForm onSubmit={onSubmit} />);

    await preencherObrigatorios(container, user);
    await user.click(screen.getByRole("button", { name: /adicionar responsável/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [data] = onSubmit.mock.calls[0];
    expect(data).toMatchObject({
      nome: "Maria da Silva",
      telefone: "21999999999",
      parentesco: "MAE",
      contato_principal: true,
    });
  });

  it("exibe a mensagem de erro do servidor quando serverError é passado", () => {
    render(<ResponsavelForm onSubmit={vi.fn()} serverError="Telefone inválido" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Telefone inválido");
  });

  it("desabilita o botão de submit e mostra 'Salvando...' quando isSubmitting", () => {
    render(<ResponsavelForm onSubmit={vi.fn()} isSubmitting />);
    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
  });

  it("chama onSkip quando o botão Pular é clicado, sem chamar onSubmit", async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    const onSubmit = vi.fn();
    render(<ResponsavelForm onSubmit={onSubmit} onSkip={onSkip} />);

    await user.click(screen.getByRole("button", { name: /pular/i }));

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("não mostra o botão Pular quando onSkip não é passado", () => {
    render(<ResponsavelForm onSubmit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /pular/i })).not.toBeInTheDocument();
  });

  it("chama onCancel quando o botão Voltar é clicado", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ResponsavelForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /voltar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
