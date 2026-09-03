import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { usePermission } from "@/features/auth/hooks/use-permission";
import type { TurmaDTO } from "@/features/turmas/types/turma.types";
import { TurmaTable } from "./turma-table";

vi.mock("@/features/auth/hooks/use-permission");

const mockedUsePermission = vi.mocked(usePermission);

const pagination = { total: 1, page: 1, per_page: 20 };

function turma(overrides: Partial<TurmaDTO> = {}): TurmaDTO {
  return {
    id: "t1",
    nome: "Sub-13 Manhã",
    faixa_etaria_min: 10,
    faixa_etaria_max: 13,
    capacidade_max: 20,
    status: "ATIVA",
    horarios: [],
    criado_em: "2026-01-01T00:00:00Z",
    atualizado_em: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("TurmaTable", () => {
  it("exibe o skeleton de carregamento quando isLoading=true e não há turmas ainda", () => {
    mockedUsePermission.mockReturnValue(false);
    const { container } = render(
      <TurmaTable turmas={[]} pagination={pagination} onPageChange={vi.fn()} isLoading />,
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("exibe mensagem de vazio quando não há turmas", () => {
    mockedUsePermission.mockReturnValue(false);
    render(<TurmaTable turmas={[]} pagination={{ total: 0, page: 1, per_page: 20 }} onPageChange={vi.fn()} />);

    expect(screen.getByText("Nenhuma turma encontrada")).toBeInTheDocument();
  });

  it("renderiza nome, faixa etária, capacidade, status e contagem de horários", () => {
    mockedUsePermission.mockReturnValue(false);
    const t = turma({
      nome: "Sub-13 Manhã",
      faixa_etaria_min: 10,
      faixa_etaria_max: 13,
      capacidade_max: 20,
      horarios: [{ id: "h1", dia_semana: "SEG", hora_inicio: "08:00", hora_fim: "09:00" }],
    });
    render(<TurmaTable turmas={[t]} pagination={pagination} onPageChange={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Sub-13 Manhã" })).toHaveAttribute("href", "/turmas/t1");
    expect(screen.getByText("10–13 anos")).toBeInTheDocument();
    expect(screen.getByText("20 vagas")).toBeInTheDocument();
    expect(screen.getByText("Ativa")).toBeInTheDocument();
    expect(screen.getByText("1 horário")).toBeInTheDocument();
  });

  it("exibe '—' quando a turma não tem horários cadastrados", () => {
    mockedUsePermission.mockReturnValue(false);
    render(<TurmaTable turmas={[turma({ horarios: [] })]} pagination={pagination} onPageChange={vi.fn()} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("não exibe o link de editar quando o usuário não tem permissão de ADMIN", () => {
    mockedUsePermission.mockReturnValue(false);
    render(<TurmaTable turmas={[turma()]} pagination={pagination} onPageChange={vi.fn()} />);

    expect(screen.queryByRole("link", { name: /editar/i })).not.toBeInTheDocument();
  });

  it("exibe o link de editar quando o usuário é ADMIN", () => {
    mockedUsePermission.mockReturnValue(true);
    render(<TurmaTable turmas={[turma()]} pagination={pagination} onPageChange={vi.fn()} />);

    expect(screen.getByRole("link", { name: /editar/i })).toHaveAttribute("href", "/turmas/t1/editar");
  });

  it("chama onPageChange com a página seguinte/anterior e desabilita os limites", async () => {
    mockedUsePermission.mockReturnValue(false);
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    const turmas = [turma()];
    const pag = { total: 40, page: 2, per_page: 20 };
    render(<TurmaTable turmas={turmas} pagination={pag} onPageChange={onPageChange} />);

    expect(screen.getByLabelText(/página anterior/i)).not.toBeDisabled();
    expect(screen.getByLabelText(/próxima página/i)).toBeDisabled();

    await user.click(screen.getByLabelText(/página anterior/i));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
