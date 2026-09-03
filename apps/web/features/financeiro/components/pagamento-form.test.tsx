import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PagamentoForm } from "./pagamento-form";

const LABELS: Record<string, RegExp> = {
  valor_pago: /valor pago/i,
  data_pagamento: /data do pagamento/i,
};

function getField(_container: HTMLElement, name: string) {
  return screen.getByLabelText(LABELS[name] ?? name, {
    selector: "input,select,textarea",
  }) as HTMLInputElement | HTMLSelectElement;
}

describe("PagamentoForm", () => {
  it("pré-preenche valor pago com o valorSugerido e a data com hoje", () => {
    const { container } = render(<PagamentoForm valorSugerido="150.00" onSubmit={vi.fn()} onCancel={vi.fn()} />);

    expect(getField(container, "valor_pago")).toHaveValue("150.00");
    const today = new Date().toISOString().slice(0, 10);
    expect(getField(container, "data_pagamento")).toHaveValue(today);
  });

  it("exibe erro de validação quando a forma de pagamento não é selecionada", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PagamentoForm valorSugerido="150.00" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /confirmar pagamento/i }));

    expect(await screen.findByText("Selecione a forma de pagamento")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exibe erro de validação quando o valor pago está em formato inválido", async () => {
    const user = userEvent.setup();
    const { container } = render(<PagamentoForm valorSugerido="150.00" onSubmit={vi.fn()} onCancel={vi.fn()} />);

    const valorInput = getField(container, "valor_pago");
    await user.clear(valorInput);
    await user.type(valorInput, "abc");
    await user.selectOptions(screen.getByRole("combobox"), "PIX");
    await user.click(screen.getByRole("button", { name: /confirmar pagamento/i }));

    expect(await screen.findByText("Valor inválido (use o formato 150.00)")).toBeInTheDocument();
  });

  it("chama onSubmit com os valores do formulário", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PagamentoForm valorSugerido="150.00" onSubmit={onSubmit} onCancel={vi.fn()} />);

    await user.selectOptions(screen.getByRole("combobox"), "PIX");
    await user.click(screen.getByRole("button", { name: /confirmar pagamento/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ valor_pago: "150.00", forma_pagamento: "PIX" }),
      expect.anything(),
    );
  });

  it("exibe a mensagem de erro do servidor quando informada", () => {
    render(<PagamentoForm valorSugerido="150.00" onSubmit={vi.fn()} onCancel={vi.fn()} serverError="Falha ao registrar pagamento" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao registrar pagamento");
  });

  it("desabilita os botões e mostra o texto de carregamento enquanto isSubmitting", () => {
    render(<PagamentoForm valorSugerido="150.00" onSubmit={vi.fn()} onCancel={vi.fn()} isSubmitting />);

    expect(screen.getByRole("button", { name: /registrando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
  });

  it("chama onCancel ao clicar em Cancelar", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PagamentoForm valorSugerido="150.00" onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
