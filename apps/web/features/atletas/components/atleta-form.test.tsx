import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AtletaForm } from "./atleta-form";

// Rótulos exibidos pelo `Field` interno — os campos são selecionados por
// label (getByLabelText), não pelo atributo `name` do React Hook Form.
const LABELS: Record<string, RegExp> = {
  nome: /nome completo/i,
  data_nascimento: /data de nascimento/i,
  cpf: /^cpf$/i,
};

function field(_container: HTMLElement, name: string) {
  return screen.getByLabelText(LABELS[name] ?? name, { selector: "input,select,textarea" }) as HTMLElement;
}

async function preencherObrigatorios(_container: HTMLElement, user: ReturnType<typeof userEvent.setup>) {
  await user.type(field(_container, "nome"), "João da Silva");
  await user.type(field(_container, "data_nascimento"), "2010-05-20");
}

describe("AtletaForm", () => {
  it("exibe erro de validação quando o nome é muito curto", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<AtletaForm onSubmit={onSubmit} />);

    await user.type(field(container, "nome"), "Jo");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Nome deve ter ao menos 3 caracteres")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exibe erro de validação quando a data de nascimento está vazia", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<AtletaForm onSubmit={onSubmit} />);

    await user.type(field(container, "nome"), "João da Silva");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Data inválida (use YYYY-MM-DD)")).toBeInTheDocument();
  });

  it("exibe erro de validação quando o CPF não tem 11 dígitos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<AtletaForm onSubmit={onSubmit} />);

    await preencherObrigatorios(container, user);
    await user.type(field(container, "cpf"), "123");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("CPF deve ter 11 dígitos")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("chama onSubmit com os dados normalizados quando o formulário é válido", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<AtletaForm onSubmit={onSubmit} />);

    await preencherObrigatorios(container, user);
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    const [data] = onSubmit.mock.calls[0];
    expect(data.nome).toBe("João da Silva");
    expect(data.data_nascimento).toBe("2010-05-20");
    expect(data.cpf).toBeUndefined();
  });

  it("exibe a mensagem de erro do servidor quando serverError é passado", () => {
    render(<AtletaForm onSubmit={vi.fn()} serverError="CPF já cadastrado" />);
    expect(screen.getByRole("alert")).toHaveTextContent("CPF já cadastrado");
  });

  it("desabilita o botão de submit e mostra 'Salvando...' quando isSubmitting", () => {
    render(<AtletaForm onSubmit={vi.fn()} isSubmitting />);
    const button = screen.getByRole("button", { name: /salvando/i });
    expect(button).toBeDisabled();
  });

  it("chama onCancel quando o botão Cancelar é clicado", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<AtletaForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("preenche os campos com os valores iniciais (edição)", () => {
    const { container } = render(
      <AtletaForm
        onSubmit={vi.fn()}
        initial={{ nome: "João Editado", data_nascimento: "2010-05-20" }}
      />,
    );
    expect(field(container, "nome")).toHaveValue("João Editado");
  });
});
