import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ResumoTiles } from "./resumo-tiles";

describe("ResumoTiles", () => {
  it("formata os 3 totais do resumo como moeda BRL", () => {
    render(
      <ResumoTiles
        resumo={{ total_pendente: "150.5", total_vencido: "300", total_pago: "1200.99" }}
      />,
    );

    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.getByText("R$ 150,50")).toBeInTheDocument();
    expect(screen.getByText("Vencido")).toBeInTheDocument();
    expect(screen.getByText("R$ 300,00")).toBeInTheDocument();
    expect(screen.getByText("Pago")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.200,99")).toBeInTheDocument();
  });

  it("mostra os rótulos sem os valores quando isLoading=true (skeleton no lugar do valor)", () => {
    render(<ResumoTiles resumo={undefined} isLoading />);

    expect(screen.getByText("Pendente")).toBeInTheDocument();
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });

  it("mostra o skeleton quando resumo é undefined mesmo sem isLoading explícito", () => {
    render(<ResumoTiles resumo={undefined} />);

    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });
});
