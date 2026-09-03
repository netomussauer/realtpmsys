import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { usePermission } from "@/features/auth/hooks/use-permission";
import { atletaService } from "@/features/atletas/services/atleta.service";
import { turmaService } from "@/features/turmas/services/turma.service";
import type { MatriculaDTO } from "@/features/turmas/types/turma.types";
import { MatriculaTable } from "./matricula-table";

vi.mock("@/features/auth/hooks/use-permission");
vi.mock("@/features/atletas/services/atleta.service");
vi.mock("@/features/turmas/services/turma.service");

const mockedUsePermission = vi.mocked(usePermission);
const mockedGetById = vi.mocked(atletaService.getById);
const mockedCancelarMatricula = vi.mocked(turmaService.cancelarMatricula);

const pagination = { total: 1, page: 1, per_page: 20 };

function matricula(overrides: Partial<MatriculaDTO> = {}): MatriculaDTO {
  return {
    id: "m1",
    atleta_id: "a1",
    turma_id: "t1",
    data_inicio: "2026-01-01",
    data_fim: null,
    status: "ATIVA",
    ...overrides,
  };
}

function renderTable(props: Partial<React.ComponentProps<typeof MatriculaTable>> = {}) {
  return render(
    <MatriculaTable
      turmaId="t1"
      matriculas={[matricula()]}
      pagination={pagination}
      onPageChange={vi.fn()}
      {...props}
    />,
    { wrapper: QueryWrapper },
  );
}

describe("MatriculaTable", () => {
  let confirmSpy: MockInstance;

  beforeEach(() => {
    mockedGetById.mockReset();
    mockedCancelarMatricula.mockReset();
    mockedGetById.mockResolvedValue({ id: "a1", nome: "João Silva" } as never);
    confirmSpy = vi.spyOn(window, "confirm");
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it("exibe mensagem de carregamento quando isLoading=true e não há matrículas ainda", () => {
    mockedUsePermission.mockReturnValue(false);
    render(
      <MatriculaTable turmaId="t1" matriculas={[]} pagination={pagination} onPageChange={vi.fn()} isLoading />,
      { wrapper: QueryWrapper },
    );

    expect(screen.getByText("Carregando matrículas...")).toBeInTheDocument();
  });

  it("exibe mensagem de vazio quando não há matrículas", () => {
    mockedUsePermission.mockReturnValue(false);
    render(
      <MatriculaTable turmaId="t1" matriculas={[]} pagination={{ total: 0, page: 1, per_page: 20 }} onPageChange={vi.fn()} />,
      { wrapper: QueryWrapper },
    );

    expect(screen.getByText("Nenhuma matrícula encontrada.")).toBeInTheDocument();
  });

  it("resolve e exibe o nome do atleta via useAtleta, e formata as datas em pt-BR", async () => {
    mockedUsePermission.mockReturnValue(false);
    renderTable({ matriculas: [matricula({ data_inicio: "2026-03-10", data_fim: "2026-06-10" })] });

    expect(mockedGetById).toHaveBeenCalledWith("a1");
    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());
    expect(screen.getByText("10/03/2026")).toBeInTheDocument();
    expect(screen.getByText("10/06/2026")).toBeInTheDocument();
  });

  it("exibe '—' quando a matrícula não tem data_fim", async () => {
    mockedUsePermission.mockReturnValue(false);
    renderTable({ matriculas: [matricula({ data_fim: null })] });

    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("não exibe a coluna de ações quando o usuário não é ADMIN", async () => {
    mockedUsePermission.mockReturnValue(false);
    renderTable();

    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /cancelar matrícula/i })).not.toBeInTheDocument();
  });

  it("ADMIN vê o botão de cancelar apenas para matrículas ATIVA", async () => {
    mockedUsePermission.mockReturnValue(true);
    renderTable({
      matriculas: [matricula({ id: "m1", status: "ATIVA" }), matricula({ id: "m2", status: "CANCELADA" })],
    });

    await waitFor(() => expect(screen.getAllByText("João Silva")).toHaveLength(2));
    expect(screen.getAllByRole("button", { name: /cancelar matrícula/i })).toHaveLength(1);
  });

  it("clicar em cancelar após confirmar chama turmaService.cancelarMatricula com o id da matrícula", async () => {
    mockedUsePermission.mockReturnValue(true);
    mockedCancelarMatricula.mockResolvedValue(matricula({ status: "CANCELADA" }) as never);
    confirmSpy.mockReturnValue(true);
    const user = userEvent.setup();
    renderTable();

    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /cancelar matrícula/i }));

    expect(confirmSpy).toHaveBeenCalledWith("Cancelar esta matrícula?");
    await waitFor(() => expect(mockedCancelarMatricula).toHaveBeenCalledWith("m1"));
  });

  it("clicar em cancelar e recusar o confirm NÃO chama o serviço", async () => {
    mockedUsePermission.mockReturnValue(true);
    confirmSpy.mockReturnValue(false);
    const user = userEvent.setup();
    renderTable();

    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());
    await user.click(screen.getByRole("button", { name: /cancelar matrícula/i }));

    expect(mockedCancelarMatricula).not.toHaveBeenCalled();
  });

  it("chama onPageChange com a página seguinte quando há mais de uma página", async () => {
    mockedUsePermission.mockReturnValue(false);
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    renderTable({ pagination: { total: 40, page: 1, per_page: 20 }, onPageChange });

    await waitFor(() => expect(screen.getByText("João Silva")).toBeInTheDocument());
    await user.click(screen.getByLabelText(/próxima página/i));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
