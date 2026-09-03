import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { InadimplenciaFilterBar } from "./inadimplencia-filter-bar";

describe("InadimplenciaFilterBar", () => {
  it("não mostra o botão Limpar quando não há filtros", () => {
    render(<InadimplenciaFilterBar value={{}} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /limpar/i })).not.toBeInTheDocument();
  });

  it("mostra o botão Limpar quando competencia_ano está definido, e reseta ao clicar", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InadimplenciaFilterBar value={{ competencia_ano: 2026 }} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /limpar/i }));

    expect(onChange).toHaveBeenCalledWith({});
  });

  it("chama onChange com o ano como número ao digitar", () => {
    // Input controlado sem estado no teste (spy não re-renderiza com o novo
    // `value`) — digitar caractere a caractere via userEvent faria o React
    // "descartar" os anteriores a cada keystroke. Um único fireEvent.change
    // reflete o comportamento real de um usuário preenchendo o campo cujo
    // valor é então propagado de volta pelo componente pai.
    const onChange = vi.fn();
    render(<InadimplenciaFilterBar value={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText(/^Ano$/i), { target: { value: "2026" } });

    expect(onChange).toHaveBeenCalledWith({ competencia_ano: 2026 });
  });

  it("chama onChange com competencia_mes ao selecionar um mês", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InadimplenciaFilterBar value={{}} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText(/^Mês$/i), "3");

    expect(onChange).toHaveBeenCalledWith({ competencia_mes: 3 });
  });

  it("chama onChange com competencia_mes undefined ao voltar para 'Todos'", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<InadimplenciaFilterBar value={{ competencia_mes: 3 }} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText(/^Mês$/i), "");

    expect(onChange).toHaveBeenCalledWith({ competencia_mes: undefined });
  });
});
