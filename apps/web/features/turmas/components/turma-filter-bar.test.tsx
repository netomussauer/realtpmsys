import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TurmaFilter } from "@/features/turmas/types/turma.types";
import { TurmaFilterBar } from "./turma-filter-bar";

describe("TurmaFilterBar", () => {
  it("chama onChange com o nome digitado (debounced) e reseta a página para 1", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TurmaFilterBar value={{ page: 1 }} onChange={onChange} />);

    await user.type(screen.getByPlaceholderText(/sub-13/i), "Sub-13");

    await vi.waitFor(
      () => expect(onChange).toHaveBeenCalledWith({ page: 1, nome: "Sub-13" }),
      { timeout: 2000 },
    );
  });

  it("chama onChange imediatamente ao trocar o status (sem debounce) e reseta a página para 1", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<TurmaFilterBar value={{ page: 1 }} onChange={onChange} />);

    await user.selectOptions(screen.getByRole("combobox"), "ATIVA");

    expect(onChange).toHaveBeenCalledWith({ page: 1, status: "ATIVA" });
  });

  it("não exibe o botão Limpar quando não há filtros ativos", () => {
    render(<TurmaFilterBar value={{ page: 1 }} onChange={vi.fn()} />);

    expect(screen.queryByRole("button", { name: /limpar/i })).not.toBeInTheDocument();
  });

  it("exibe o botão Limpar quando há filtro de nome ou status e ele reseta o filtro", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const value: TurmaFilter = { nome: "Sub-13", status: "ATIVA", page: 2, per_page: 20 };
    render(<TurmaFilterBar value={value} onChange={onChange} />);

    const limpar = screen.getByRole("button", { name: /limpar/i });
    await user.click(limpar);

    expect(onChange).toHaveBeenCalledWith({ page: 1, per_page: 20 });
  });

  it("sincroniza o campo de busca quando o filtro de nome é limpo externamente", () => {
    const { rerender } = render(<TurmaFilterBar value={{ nome: "Sub-13", page: 1 }} onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText(/sub-13/i)).toHaveValue("Sub-13");

    rerender(<TurmaFilterBar value={{ page: 1 }} onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText(/sub-13/i)).toHaveValue("");
  });
});
