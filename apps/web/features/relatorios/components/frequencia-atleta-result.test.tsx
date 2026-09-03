import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FrequenciaAtletaResult } from "./frequencia-atleta-result";

describe("FrequenciaAtletaResult", () => {
  it("não renderiza nada quando resultado é undefined e não está carregando", () => {
    const { container } = render(<FrequenciaAtletaResult resultado={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra o esqueleto de carregamento quando isLoading", () => {
    const { container } = render(<FrequenciaAtletaResult resultado={undefined} isLoading />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("mostra os 4 tiles com os números do resultado", () => {
    render(
      <FrequenciaAtletaResult
        resultado={{
          atleta_id: "a1",
          data_inicio: "2026-01-01",
          data_fim: "2026-01-31",
          presentes: 8,
          ausentes: 2,
          justificados: 1,
          total: 11,
          taxa_presenca_pc: 72.7,
        }}
      />,
    );

    expect(screen.getByText("Presenças")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("Faltas")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Justificadas")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("Total de treinos")).toBeInTheDocument();
    expect(screen.getByText("11")).toBeInTheDocument();
    expect(screen.getByText("72.7%")).toBeInTheDocument();
  });

  it("formata o período com formatDateBR", () => {
    render(
      <FrequenciaAtletaResult
        resultado={{
          atleta_id: "a1",
          data_inicio: "2026-01-01",
          data_fim: "2026-01-31",
          presentes: 8,
          ausentes: 2,
          justificados: 1,
          total: 11,
          taxa_presenca_pc: 72.7,
        }}
      />,
    );

    expect(screen.getByText(/01\/01\/2026 a 31\/01\/2026/)).toBeInTheDocument();
  });

  it("limita a barra de progresso a 100% quando taxa_presenca_pc excede 100", () => {
    render(
      <FrequenciaAtletaResult
        resultado={{
          atleta_id: "a1",
          data_inicio: "2026-01-01",
          data_fim: "2026-01-31",
          presentes: 10,
          ausentes: 0,
          justificados: 0,
          total: 10,
          taxa_presenca_pc: 120,
        }}
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  });

  it("limita a barra de progresso a 0% quando taxa_presenca_pc é negativa", () => {
    render(
      <FrequenciaAtletaResult
        resultado={{
          atleta_id: "a1",
          data_inicio: "2026-01-01",
          data_fim: "2026-01-31",
          presentes: 0,
          ausentes: 0,
          justificados: 0,
          total: 0,
          taxa_presenca_pc: -5,
        }}
      />,
    );

    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
