import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { TreinoFilterBar } from "./treino-filter-bar";

describe("TreinoFilterBar", () => {
  it("chama onChange com data_inicio e reseta a página ao preencher o campo 'De'", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TreinoFilterBar value={{ page: 2 }} onChange={onChange} />);

    const de = screen.getByLabelText(/^de$/i);
    await user.type(de, "2026-08-01");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ data_inicio: "2026-08-01", page: 1 }),
    );
  });

  it("chama onChange com data_fim e reseta a página ao preencher o campo 'Até'", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TreinoFilterBar value={{ page: 2 }} onChange={onChange} />);

    const ate = screen.getByLabelText(/^até$/i);
    await user.type(ate, "2026-08-31");

    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ data_fim: "2026-08-31", page: 1 }),
    );
  });

  it("mostra o botão Limpar somente quando há filtro ativo e limpa ao clicar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TreinoFilterBar value={{ data_inicio: "2026-08-01", per_page: 30 }} onChange={onChange} />);

    const limpar = screen.getByRole("button", { name: /limpar/i });
    await user.click(limpar);

    expect(onChange).toHaveBeenCalledWith({ page: 1, per_page: 30 });
  });

  it("não mostra o botão Limpar quando não há filtro ativo", () => {
    render(<TreinoFilterBar value={{}} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /limpar/i })).not.toBeInTheDocument();
  });
});
