import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { usePlanosAtivos } from "@/features/financeiro/hooks/use-planos";
import { ContratoForm } from "./contrato-form";

vi.mock("@/features/financeiro/hooks/use-planos");

const mockedUsePlanosAtivos = vi.mocked(usePlanosAtivos);

const PLANOS = [
  { id: "123e4567-e89b-12d3-a456-426614174000", nome: "Mensal", dias_semana: 3, valor_mensal: "150.00", dia_vencimento: 10, ativo: true },
];

function mockPlanos(data: typeof PLANOS | undefined, isLoading = false) {
  mockedUsePlanosAtivos.mockReturnValue({
    data,
    isLoading,
  } as unknown as ReturnType<typeof usePlanosAtivos>);
}

const LABELS: Record<string, RegExp> = {
  data_inicio: /data de início/i,
  valor_contratado: /valor contratado/i,
};

function getField(_container: HTMLElement, name: string) {
  return screen.getByLabelText(LABELS[name] ?? name, {
    selector: "input,select,textarea",
  }) as HTMLInputElement | HTMLSelectElement;
}

describe("ContratoForm", () => {
  it("lista os planos ativos no select", () => {
    mockPlanos(PLANOS);
    render(<ContratoForm onSubmit={vi.fn()} />);

    const option = screen.getByRole("option", { name: /mensal/i });
    expect(option).toHaveTextContent("R$ 150,00/mês");
  });

  it("desabilita o select de plano enquanto os planos carregam", () => {
    mockPlanos(undefined, true);
    render(<ContratoForm onSubmit={vi.fn()} />);

    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("exibe erro de validação quando nenhum plano é selecionado", async () => {
    mockPlanos(PLANOS);
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<ContratoForm onSubmit={onSubmit} />);

    await user.type(getField(container, "data_inicio"), "2026-01-15");
    await user.click(screen.getByRole("button", { name: /firmar contrato/i }));

    expect(await screen.findByText("Selecione um plano")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exibe erro de validação quando o valor contratado está em formato inválido", async () => {
    mockPlanos(PLANOS);
    const user = userEvent.setup();
    const { container } = render(<ContratoForm onSubmit={vi.fn()} />);

    await user.selectOptions(screen.getByRole("combobox"), PLANOS[0].id);
    await user.type(getField(container, "data_inicio"), "2026-01-15");
    await user.type(getField(container, "valor_contratado"), "abc");
    await user.click(screen.getByRole("button", { name: /firmar contrato/i }));

    expect(await screen.findByText("Valor inválido (use o formato 150.00)")).toBeInTheDocument();
  });

  it("chama onSubmit com os valores do formulário quando válido", async () => {
    mockPlanos(PLANOS);
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<ContratoForm onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByRole("combobox"), PLANOS[0].id);
    await user.type(getField(container, "data_inicio"), "2026-01-15");
    await user.click(screen.getByRole("button", { name: /firmar contrato/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ plano_id: PLANOS[0].id, data_inicio: "2026-01-15" }),
      expect.anything(),
    );
  });

  it("mostra o valor do plano selecionado como referência quando valor_contratado está em branco", async () => {
    mockPlanos(PLANOS);
    const user = userEvent.setup();
    render(<ContratoForm onSubmit={vi.fn()} />);

    await user.selectOptions(screen.getByRole("combobox"), PLANOS[0].id);

    expect(screen.getByText(/deixe em branco para usar o valor do plano \(r\$ 150,00\)/i)).toBeInTheDocument();
  });

  it("exibe a mensagem de erro do servidor quando informada", () => {
    mockPlanos(PLANOS);
    render(<ContratoForm onSubmit={vi.fn()} serverError="Atleta já possui contrato ativo" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Atleta já possui contrato ativo");
  });

  it("desabilita os botões e mostra o texto de carregamento enquanto isSubmitting", () => {
    mockPlanos(PLANOS);
    render(<ContratoForm onSubmit={vi.fn()} onCancel={vi.fn()} isSubmitting />);

    expect(screen.getByRole("button", { name: /firmando contrato/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
  });

  it("chama onCancel ao clicar em Cancelar", async () => {
    mockPlanos(PLANOS);
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<ContratoForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
