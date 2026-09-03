import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AtletaFilterBar } from "./atleta-filter-bar";

describe("AtletaFilterBar", () => {
  it("exibe o nome inicial do filtro no input", () => {
    render(<AtletaFilterBar value={{ nome: "João" }} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/João, Maria/i)).toHaveValue("João");
  });

  it("chama onChange com o nome (debounced 300ms) e reseta a página", async () => {
    const onChange = vi.fn();
    render(<AtletaFilterBar value={{}} onChange={onChange} />);

    fireEvent.change(screen.getByPlaceholderText(/João, Maria/i), { target: { value: "Pedro" } });

    expect(onChange).not.toHaveBeenCalled();

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ nome: "Pedro", page: 1 }), { timeout: 2000 });
  });

  it("chama onChange imediatamente ao trocar o status (sem debounce)", () => {
    const onChange = vi.fn();
    render(<AtletaFilterBar value={{}} onChange={onChange} />);

    fireEvent.change(screen.getByDisplayValue("Todos"), { target: { value: "ATIVO" } });

    expect(onChange).toHaveBeenCalledWith({ status: "ATIVO", page: 1 });
  });

  it("não mostra o botão Limpar quando não há filtros ativos", () => {
    render(<AtletaFilterBar value={{}} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /limpar/i })).not.toBeInTheDocument();
  });

  it("mostra o botão Limpar quando há filtro de nome ou status, e reseta ao clicar", () => {
    const onChange = vi.fn();
    render(<AtletaFilterBar value={{ nome: "João", per_page: 10 }} onChange={onChange} />);

    fireEvent.click(screen.getByRole("button", { name: /limpar/i }));

    expect(onChange).toHaveBeenCalledWith({ page: 1, per_page: 10 });
  });

  it("sincroniza o input local quando value.nome muda externamente", () => {
    const { rerender } = render(<AtletaFilterBar value={{ nome: "João" }} onChange={vi.fn()} />);
    expect(screen.getByPlaceholderText(/João, Maria/i)).toHaveValue("João");

    rerender(<AtletaFilterBar value={{}} onChange={vi.fn()} />);

    expect(screen.getByPlaceholderText(/João, Maria/i)).toHaveValue("");
  });
});
