import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TreinoForm } from "./treino-form";

const LABELS: Record<string, RegExp> = {
  data_treino: /data do treino/i,
  hora_inicio: /^hora início/i,
  hora_fim: /^hora fim/i,
};

function getField(_container: HTMLElement, name: string) {
  return screen.getByLabelText(LABELS[name] ?? name, {
    selector: "input,select,textarea",
  }) as HTMLInputElement | HTMLTextAreaElement;
}

describe("TreinoForm", () => {
  it("exibe erro de validação quando a data do treino está vazia", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<TreinoForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /registrar treino/i }));

    expect(await screen.findByText("Data inválida (use AAAA-MM-DD)")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exibe erro quando só a hora início é informada", async () => {
    const user = userEvent.setup();
    const { container } = render(<TreinoForm onSubmit={vi.fn()} />);

    await user.type(getField(container, "data_treino"), "2026-08-20");
    await user.type(getField(container, "hora_inicio"), "18:00");
    await user.click(screen.getByRole("button", { name: /registrar treino/i }));

    expect(
      await screen.findByText("Informe hora início e hora fim juntas, ou deixe as duas em branco"),
    ).toBeInTheDocument();
  });

  it("exibe erro quando hora fim não é depois da hora início", async () => {
    const user = userEvent.setup();
    const { container } = render(<TreinoForm onSubmit={vi.fn()} />);

    await user.type(getField(container, "data_treino"), "2026-08-20");
    await user.type(getField(container, "hora_inicio"), "19:00");
    await user.type(getField(container, "hora_fim"), "18:00");
    await user.click(screen.getByRole("button", { name: /registrar treino/i }));

    expect(await screen.findByText("Hora fim deve ser depois da hora início")).toBeInTheDocument();
  });

  it("chama onSubmit com data e horário quando o formulário é válido", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const { container } = render(<TreinoForm onSubmit={onSubmit} />);

    await user.type(getField(container, "data_treino"), "2026-08-20");
    await user.type(getField(container, "hora_inicio"), "18:00");
    await user.type(getField(container, "hora_fim"), "19:30");
    await user.click(screen.getByRole("button", { name: /registrar treino/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ data_treino: "2026-08-20", hora_inicio: "18:00", hora_fim: "19:30" }),
      expect.anything(),
    );
  });

  it("exibe a mensagem de erro do servidor quando informada", () => {
    render(<TreinoForm onSubmit={vi.fn()} serverError="já existe treino para esta turma nesta data" />);

    expect(screen.getByRole("alert")).toHaveTextContent("já existe treino para esta turma nesta data");
  });

  it("desabilita os botões e mostra o texto de carregamento enquanto isSubmitting", () => {
    render(<TreinoForm onSubmit={vi.fn()} onCancel={vi.fn()} isSubmitting />);

    expect(screen.getByRole("button", { name: /registrando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
  });

  it("chama onCancel ao clicar em Cancelar", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<TreinoForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("não renderiza o botão Cancelar quando onCancel não é passado", () => {
    render(<TreinoForm onSubmit={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /cancelar/i })).not.toBeInTheDocument();
  });
});
