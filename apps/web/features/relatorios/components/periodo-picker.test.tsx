import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PeriodoPicker } from "./periodo-picker";

describe("PeriodoPicker", () => {
  it("exibe os valores iniciais nos dois campos de data", () => {
    render(<PeriodoPicker value={{ data_inicio: "2026-01-01", data_fim: "2026-01-31" }} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/^De/i)).toHaveValue("2026-01-01");
    expect(screen.getByLabelText(/^Até/i)).toHaveValue("2026-01-31");
  });

  it("chama onChange ao alterar a data inicial", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PeriodoPicker value={{ data_inicio: "", data_fim: "" }} onChange={onChange} />);

    await user.type(screen.getByLabelText(/^De/i), "2026-01-01");

    expect(onChange).toHaveBeenCalledWith({ data_inicio: "2026-01-01", data_fim: "" });
  });

  it("não mostra erro quando apenas uma das datas está preenchida", () => {
    render(<PeriodoPicker value={{ data_inicio: "2026-02-01", data_fim: "" }} onChange={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("mostra erro quando as duas datas estão preenchidas e data_fim é anterior a data_inicio", () => {
    render(<PeriodoPicker value={{ data_inicio: "2026-02-01", data_fim: "2026-01-01" }} onChange={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Data final deve ser igual ou depois da data inicial");
  });

  it("marca aria-invalid no campo 'Até' quando há erro", () => {
    render(<PeriodoPicker value={{ data_inicio: "2026-02-01", data_fim: "2026-01-01" }} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/^Até/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("não mostra erro quando o período é válido", () => {
    render(<PeriodoPicker value={{ data_inicio: "2026-01-01", data_fim: "2026-01-31" }} onChange={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
