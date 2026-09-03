import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { InadimplenciaItemDTO } from "@/features/relatorios/types/relatorio.types";
import { InadimplenciaTable } from "./inadimplencia-table";

const itens: InadimplenciaItemDTO[] = [
  {
    mensalidade_id: "m1",
    atleta_id: "a1",
    atleta_nome: "João da Silva",
    atleta_telefone: "21999999999",
    atleta_email: null,
    competencia_ano: 2026,
    competencia_mes: 3,
    data_vencimento: "2026-03-10",
    valor: "150.00",
    status: "VENCIDO",
    dias_em_atraso: 20,
  },
];

describe("InadimplenciaTable", () => {
  it("mostra o esqueleto de carregamento quando isLoading e não há itens", () => {
    render(<InadimplenciaTable itens={[]} isLoading />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("mostra mensagem de vazio quando não há itens e não está carregando", () => {
    render(<InadimplenciaTable itens={[]} />);
    expect(screen.getByText("Nenhuma mensalidade em atraso")).toBeInTheDocument();
  });

  it("renderiza a linha com nome, competência formatada, valor em BRL, status e dias em atraso", () => {
    render(<InadimplenciaTable itens={itens} />);

    expect(screen.getByText("João da Silva")).toBeInTheDocument();
    expect(screen.getByText("03/2026")).toBeInTheDocument();
    expect(screen.getByText(/R\$\s*150,00/)).toBeInTheDocument();
    expect(screen.getByText("VENCIDO")).toBeInTheDocument();
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("21999999999")).toBeInTheDocument();
  });

  it("não mostra a linha de contato quando telefone e email são nulos", () => {
    const semContato: InadimplenciaItemDTO[] = [
      { ...itens[0], atleta_telefone: null, atleta_email: null },
    ];
    render(<InadimplenciaTable itens={semContato} />);
    expect(screen.queryByText("21999999999")).not.toBeInTheDocument();
  });

  it("combina telefone e email quando ambos estão presentes", () => {
    const comAmbos: InadimplenciaItemDTO[] = [
      { ...itens[0], atleta_telefone: "21999999999", atleta_email: "joao@realtpm.app" },
    ];
    render(<InadimplenciaTable itens={comAmbos} />);
    expect(screen.getByText("21999999999 · joao@realtpm.app")).toBeInTheDocument();
  });
});
