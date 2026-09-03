import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FrequenciaTurmaResponse } from "@/features/relatorios/types/relatorio.types";
import { FrequenciaTurmaTable } from "./frequencia-turma-table";

const resultado: FrequenciaTurmaResponse = {
  turma_id: "t1",
  data_inicio: "2026-01-01",
  data_fim: "2026-01-31",
  total_treinos: 10,
  data: [
    { atleta_id: "a1", atleta_nome: "João", presentes: 8, ausentes: 2, justificados: 0, total: 10, taxa_presenca_pc: 80 },
    { atleta_id: "a2", atleta_nome: "Maria", presentes: 3, ausentes: 7, justificados: 0, total: 10, taxa_presenca_pc: 30 },
  ],
};

describe("FrequenciaTurmaTable", () => {
  it("mostra o esqueleto de carregamento quando isLoading", () => {
    render(<FrequenciaTurmaTable resultado={undefined} isLoading />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("não renderiza nada quando resultado é undefined e não está carregando", () => {
    const { container } = render(<FrequenciaTurmaTable resultado={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("mostra mensagem de vazio quando data está vazio", () => {
    render(<FrequenciaTurmaTable resultado={{ ...resultado, data: [] }} />);
    expect(screen.getByText("Sem dados de frequência")).toBeInTheDocument();
  });

  it("mostra o total de treinos e uma linha por atleta", () => {
    render(<FrequenciaTurmaTable resultado={resultado} />);

    expect(screen.getByText("10")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
    expect(screen.getByText("Maria")).toBeInTheDocument();
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText("30.0%")).toBeInTheDocument();
  });

  it("aplica classe destrutiva na taxa quando abaixo de 50%", () => {
    render(<FrequenciaTurmaTable resultado={resultado} />);
    expect(screen.getByText("30.0%")).toHaveClass("text-destructive");
    expect(screen.getByText("80.0%")).not.toHaveClass("text-destructive");
  });
});
