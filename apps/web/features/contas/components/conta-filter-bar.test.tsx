import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ContaFilterBar } from "./conta-filter-bar";

describe("ContaFilterBar", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("busca: aplica após 300ms de debounce e reseta a página para 1", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onChange = vi.fn();
    render(<ContaFilterBar value={{ page: 3, per_page: 20 }} onChange={onChange} />);

    await user.type(screen.getByLabelText(/buscar por e-mail ou nome/i), "ana");
    expect(onChange).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(300);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ page: 1, per_page: 20, busca: "ana" });
  });

  it("perfil: muda o filtro imediatamente e reseta a página", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onChange = vi.fn();
    render(<ContaFilterBar value={{ page: 2 }} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Perfil"), "TREINADOR");

    expect(onChange).toHaveBeenCalledWith({ page: 1, perfil: "TREINADOR" });
  });

  it("status: 'Inativas' vira ativo=false; 'Todas' remove o filtro", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onChange = vi.fn();
    const { rerender } = render(<ContaFilterBar value={{}} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("Status"), "false");
    expect(onChange).toHaveBeenLastCalledWith({ page: 1, ativo: "false" });

    rerender(<ContaFilterBar value={{ ativo: "false" }} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText("Status"), "");
    expect(onChange).toHaveBeenLastCalledWith({ page: 1, ativo: undefined });
  });

  it("'Limpar' só aparece com filtro ativo e zera os filtros mantendo per_page", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onChange = vi.fn();
    const { rerender } = render(<ContaFilterBar value={{ per_page: 20 }} onChange={onChange} />);
    expect(screen.queryByRole("button", { name: /limpar/i })).not.toBeInTheDocument();

    rerender(<ContaFilterBar value={{ perfil: "ADMIN", per_page: 20 }} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /limpar/i }));

    expect(onChange).toHaveBeenCalledWith({ page: 1, per_page: 20 });
  });
});
