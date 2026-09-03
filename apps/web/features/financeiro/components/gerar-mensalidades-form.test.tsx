import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { GerarMensalidadesForm } from "./gerar-mensalidades-form";

describe("GerarMensalidadesForm", () => {
  it("pré-preenche mês e ano com a competência atual", () => {
    render(<GerarMensalidadesForm onSubmit={vi.fn()} />);

    const now = new Date();
    expect(screen.getByRole("spinbutton")).toHaveValue(now.getFullYear());
    expect(screen.getByRole("combobox")).toHaveValue(String(now.getMonth() + 1));
  });

  it("chama onSubmit com ano e mês selecionados", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<GerarMensalidadesForm onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByRole("combobox"), "3");
    await user.clear(screen.getByRole("spinbutton"));
    await user.type(screen.getByRole("spinbutton"), "2027");
    await user.click(screen.getByRole("button", { name: /gerar mensalidades/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      { competencia_ano: 2027, competencia_mes: 3 },
      expect.anything(),
    );
  });

  it("exibe a mensagem de erro do servidor quando informada", () => {
    render(<GerarMensalidadesForm onSubmit={vi.fn()} serverError="Falha ao gerar mensalidades" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao gerar mensalidades");
  });

  it("desabilita os botões e mostra o texto de carregamento enquanto isSubmitting", () => {
    render(<GerarMensalidadesForm onSubmit={vi.fn()} onCancel={vi.fn()} isSubmitting />);

    expect(screen.getByRole("button", { name: /gerando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
  });

  it("chama onCancel ao clicar em Cancelar", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<GerarMensalidadesForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("não renderiza o botão Cancelar quando onCancel não é passado", () => {
    render(<GerarMensalidadesForm onSubmit={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /cancelar/i })).not.toBeInTheDocument();
  });
});
