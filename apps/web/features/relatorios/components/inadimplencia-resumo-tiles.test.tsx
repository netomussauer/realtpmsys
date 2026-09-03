import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InadimplenciaResumoTiles } from "./inadimplencia-resumo-tiles";

describe("InadimplenciaResumoTiles", () => {
  it("mostra os totais e o valor formatado em BRL quando resumo está presente", () => {
    render(
      <InadimplenciaResumoTiles
        resumo={{ total_mensalidades: 12, total_atletas: 9, total_devido: "1500.5" }}
      />,
    );

    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*1\.500,50/)).toBeInTheDocument();
  });

  it("mostra skeletons quando resumo é undefined", () => {
    const { container } = render(<InadimplenciaResumoTiles resumo={undefined} />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("mostra skeletons quando isLoading=true mesmo com resumo presente", () => {
    const { container } = render(
      <InadimplenciaResumoTiles
        resumo={{ total_mensalidades: 12, total_atletas: 9, total_devido: "1500.5" }}
        isLoading
      />,
    );
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});
