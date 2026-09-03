import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { TreinoDTO } from "@/features/frequencia/types/frequencia.types";
import { TreinoTable } from "./treino-table";

const TREINOS: TreinoDTO[] = [
  { id: "tr1", turma_id: "t1", data_treino: "2026-08-20", hora_inicio: "18:00", hora_fim: "19:30", observacao: "Treino tático", criado_em: "2026-08-01T00:00:00Z" },
];

describe("TreinoTable", () => {
  it("mostra o estado de carregamento (skeleton) quando isLoading e a lista está vazia", () => {
    const { container } = render(
      <TreinoTable turmaId="t1" treinos={[]} pagination={{ total: 0, page: 1, per_page: 30 }} onPageChange={vi.fn()} isLoading />,
    );
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("mostra o estado vazio quando não há treinos", () => {
    render(<TreinoTable turmaId="t1" treinos={[]} pagination={{ total: 0, page: 1, per_page: 30 }} onPageChange={vi.fn()} />);
    expect(screen.getByText("Nenhum treino encontrado")).toBeInTheDocument();
  });

  it("mostra data formatada, horário e observação da linha", () => {
    render(<TreinoTable turmaId="t1" treinos={TREINOS} pagination={{ total: 1, page: 1, per_page: 30 }} onPageChange={vi.fn()} />);

    expect(screen.getByText("20/08/2026")).toBeInTheDocument();
    expect(screen.getByText("18:00–19:30")).toBeInTheDocument();
    expect(screen.getByText("Treino tático")).toBeInTheDocument();
  });

  it("mostra travessão quando não há horário ou observação", () => {
    render(
      <TreinoTable
        turmaId="t1"
        treinos={[{ id: "tr1", turma_id: "t1", data_treino: "2026-08-20", criado_em: "2026-08-01T00:00:00Z" }]}
        pagination={{ total: 1, page: 1, per_page: 30 }}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("linka cada linha para /treinos/{id}?turma_id={turmaId} (única forma de achar o treino — não existe GET /treinos/{id})", () => {
    render(<TreinoTable turmaId="t1" treinos={TREINOS} pagination={{ total: 1, page: 1, per_page: 30 }} onPageChange={vi.fn()} />);

    const links = screen.getAllByRole("link", { name: /20\/08\/2026|ver treino/i });
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/treinos/tr1?turma_id=t1");
    }
  });

  it("não mostra paginação quando há só 1 página", () => {
    render(<TreinoTable turmaId="t1" treinos={TREINOS} pagination={{ total: 1, page: 1, per_page: 30 }} onPageChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /página anterior/i })).not.toBeInTheDocument();
  });

  it("chama onPageChange ao clicar em próxima página quando há mais de 1 página", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<TreinoTable turmaId="t1" treinos={TREINOS} pagination={{ total: 40, page: 1, per_page: 30 }} onPageChange={onPageChange} />);

    await user.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
