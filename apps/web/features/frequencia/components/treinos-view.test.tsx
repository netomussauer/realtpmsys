import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useTurmas } from "@/features/turmas/hooks/use-turmas";
import { useTreinos } from "@/features/frequencia/hooks/use-treinos";
import { useCriarTreino } from "@/features/frequencia/hooks/use-mutations";
import { TreinosView } from "./treinos-view";

const { mockedUseSearchParams } = vi.hoisted(() => ({
  mockedUseSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: mockedUseSearchParams,
}));
vi.mock("@/features/turmas/hooks/use-turmas");
vi.mock("@/features/frequencia/hooks/use-treinos");
vi.mock("@/features/frequencia/hooks/use-mutations");

const mockedUseTurmas = vi.mocked(useTurmas);
const mockedUseTreinos = vi.mocked(useTreinos);
const mockedUseCriarTreino = vi.mocked(useCriarTreino);

const TURMAS = [{ id: "t1", nome: "Sub-15" }];

function mockTreinosQuery(overrides: Partial<ReturnType<typeof useTreinos>> = {}) {
  mockedUseTreinos.mockReturnValue({
    data: { data: [], pagination: { total: 0, page: 1, per_page: 30 } },
    isLoading: false,
    isError: false,
    isFetching: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useTreinos>);
}

describe("TreinosView", () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    mutateAsync.mockReset();
    mockedUseSearchParams.mockReturnValue(new URLSearchParams());
    mockedUseTurmas.mockReturnValue({
      data: { data: TURMAS, pagination: { total: 1, page: 1, per_page: 100 } },
      isLoading: false,
    } as unknown as ReturnType<typeof useTurmas>);
    mockedUseCriarTreino.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useCriarTreino>);
    mockTreinosQuery();
  });

  it("mostra o placeholder de 'Selecione uma turma' quando nenhuma turma está selecionada", () => {
    render(<TreinosView />);

    expect(screen.getByText("Selecione uma turma")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /registrar treino/i })).not.toBeInTheDocument();
  });

  it("usa ?turma_id= da URL para pré-selecionar a turma e mostra a tabela", () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("turma_id=t1"));
    mockTreinosQuery({ data: { data: [], pagination: { total: 0, page: 1, per_page: 30 } } } as never);

    render(<TreinosView />);

    expect(screen.queryByText("Selecione uma turma")).not.toBeInTheDocument();
    expect(mockedUseTreinos).toHaveBeenCalledWith("t1", expect.objectContaining({ page: 1, per_page: 30 }));
  });

  it("abre o TreinoForm ao clicar em 'Registrar treino' e some o botão de abrir", async () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("turma_id=t1"));
    const user = userEvent.setup();
    const { container } = render(<TreinosView />);

    await user.click(screen.getByRole("button", { name: /registrar treino/i }));

    // TreinoForm renderizado: campo data_treino presente e botão "Cancelar"
    // (só o TreinoForm renderiza Cancelar, pois treinos-view passa onCancel).
    expect(container.querySelector('[name="data_treino"]')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeInTheDocument();
  });

  it("fecha o TreinoForm ao clicar em Cancelar", async () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("turma_id=t1"));
    const user = userEvent.setup();
    const { container } = render(<TreinosView />);

    await user.click(screen.getByRole("button", { name: /registrar treino/i }));
    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(container.querySelector('[name="data_treino"]')).not.toBeInTheDocument();
  });

  it("chama criar.mutateAsync ao submeter o TreinoForm e fecha o form após sucesso", async () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("turma_id=t1"));
    mutateAsync.mockResolvedValue({ id: "tr1" });
    const user = userEvent.setup();
    const { container } = render(<TreinosView />);

    await user.click(screen.getByRole("button", { name: /registrar treino/i }));
    const dataInput = container.querySelector('[name="data_treino"]') as HTMLInputElement;
    await user.type(dataInput, "2026-08-20");

    // Botão do header some quando showForm=true — só resta o submit do TreinoForm.
    await user.click(screen.getByRole("button", { name: /registrar treino/i }));

    expect(mutateAsync).toHaveBeenCalledWith(expect.objectContaining({ data_treino: "2026-08-20" }));
  });

  it("mostra o erro do servidor quando a criação do treino falha, sem fechar o form", async () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("turma_id=t1"));
    mutateAsync.mockRejectedValue(new Error("já existe treino para a turma t1 na data 2026-08-20"));
    const user = userEvent.setup();
    const { container } = render(<TreinosView />);

    await user.click(screen.getByRole("button", { name: /registrar treino/i }));
    const dataInput = container.querySelector('[name="data_treino"]') as HTMLInputElement;
    await user.type(dataInput, "2026-08-20");
    await user.click(screen.getByRole("button", { name: /registrar treino/i }));

    expect(await screen.findByText("já existe treino para a turma t1 na data 2026-08-20")).toBeInTheDocument();
  });

  it("mostra alerta de erro quando a listagem de treinos falha", () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("turma_id=t1"));
    mockTreinosQuery({ isError: true, error: new Error("acesso negado") } as never);

    render(<TreinosView />);

    expect(screen.getByRole("alert")).toHaveTextContent("acesso negado");
  });
});
