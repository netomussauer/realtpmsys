import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTurma } from "@/features/turmas/hooks/use-turma";
import { useMatriculas } from "@/features/turmas/hooks/use-matriculas";
import { useAtleta } from "@/features/atletas/hooks/use-atleta";
import { useTreinos } from "@/features/frequencia/hooks/use-treinos";
import { useFrequencias } from "@/features/frequencia/hooks/use-frequencias";
import { useLancarFrequencias } from "@/features/frequencia/hooks/use-mutations";
import type { TreinoDTO, FrequenciaDTO } from "@/features/frequencia/types/frequencia.types";
import type { MatriculaDTO } from "@/features/turmas/types/turma.types";
import { TreinoDetailView } from "./treino-detail-view";

const { mockedUseSearchParams } = vi.hoisted(() => ({
  mockedUseSearchParams: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: mockedUseSearchParams,
}));
vi.mock("@/features/turmas/hooks/use-turma");
vi.mock("@/features/turmas/hooks/use-matriculas");
vi.mock("@/features/atletas/hooks/use-atleta");
vi.mock("@/features/frequencia/hooks/use-treinos");
vi.mock("@/features/frequencia/hooks/use-frequencias");
vi.mock("@/features/frequencia/hooks/use-mutations");

const mockedUseTurma = vi.mocked(useTurma);
const mockedUseMatriculas = vi.mocked(useMatriculas);
const mockedUseAtleta = vi.mocked(useAtleta);
const mockedUseTreinos = vi.mocked(useTreinos);
const mockedUseFrequencias = vi.mocked(useFrequencias);
const mockedUseLancarFrequencias = vi.mocked(useLancarFrequencias);

const TREINO: TreinoDTO = {
  id: "tr1",
  turma_id: "t1",
  data_treino: "2026-08-20",
  hora_inicio: "18:00",
  hora_fim: "19:30",
  observacao: "Treino tático",
  criado_em: "2026-08-01T00:00:00Z",
};

const MATRICULAS: MatriculaDTO[] = [
  { id: "mat1", atleta_id: "11111111-1111-1111-1111-111111111111", turma_id: "t1", data_inicio: "2026-01-01", status: "ATIVA" },
];

function mockTreinos(data: TreinoDTO[] | undefined, overrides: Partial<ReturnType<typeof useTreinos>> = {}) {
  mockedUseTreinos.mockReturnValue({
    data: data ? { data, pagination: { total: data.length, page: 1, per_page: 500 } } : undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useTreinos>);
}

function mockMatriculas(data: MatriculaDTO[] | undefined, overrides: Partial<ReturnType<typeof useMatriculas>> = {}) {
  mockedUseMatriculas.mockReturnValue({
    data: data ? { data, pagination: { total: data.length, page: 1, per_page: 500 } } : undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useMatriculas>);
}

function mockFrequencias(data: FrequenciaDTO[] | undefined, overrides: Partial<ReturnType<typeof useFrequencias>> = {}) {
  mockedUseFrequencias.mockReturnValue({
    data: data ? { data } : undefined,
    isLoading: false,
    isError: false,
    error: null,
    ...overrides,
  } as unknown as ReturnType<typeof useFrequencias>);
}

describe("TreinoDetailView", () => {
  const mutateAsync = vi.fn();

  beforeEach(() => {
    mutateAsync.mockReset();
    mockedUseSearchParams.mockReturnValue(new URLSearchParams("turma_id=t1"));
    mockedUseTurma.mockReturnValue({ data: { nome: "Sub-15" } } as unknown as ReturnType<typeof useTurma>);
    mockedUseAtleta.mockReturnValue({ data: { nome: "João Silva" }, isLoading: false } as unknown as ReturnType<typeof useAtleta>);
    mockedUseLancarFrequencias.mockReturnValue({
      mutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useLancarFrequencias>);
    mockTreinos([TREINO]);
    mockMatriculas(MATRICULAS);
    mockFrequencias([]);
  });

  it("mostra 'Link inválido' quando não há turma_id na URL", () => {
    mockedUseSearchParams.mockReturnValue(new URLSearchParams());
    render(<TreinoDetailView treinoId="tr1" />);

    expect(screen.getByRole("alert")).toHaveTextContent(/link inválido/i);
  });

  it("mostra o skeleton de carregamento enquanto os treinos da turma carregam", () => {
    mockTreinos(undefined, { isLoading: true } as never);
    const { container } = render(<TreinoDetailView treinoId="tr1" />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("mostra alerta de erro quando a listagem de treinos falha", () => {
    mockTreinos(undefined, { isError: true, error: new Error("acesso negado") } as never);
    render(<TreinoDetailView treinoId="tr1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Erro ao carregar os treinos da turma.");
    expect(screen.getByText("acesso negado")).toBeInTheDocument();
  });

  it("mostra 'Treino não encontrado' quando o id não está na lista de treinos da turma (não existe GET /treinos/{id})", () => {
    mockTreinos([]);
    render(<TreinoDetailView treinoId="tr1" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Treino não encontrado para esta turma.");
  });

  it("mostra data, turma e horário do treino encontrado", () => {
    render(<TreinoDetailView treinoId="tr1" />);

    expect(screen.getByText("Treino de 20/08/2026")).toBeInTheDocument();
    expect(screen.getByText("Sub-15")).toBeInTheDocument();
    expect(screen.getByText("18:00–19:30")).toBeInTheDocument();
    expect(screen.getByText("Treino tático")).toBeInTheDocument();
  });

  it("mostra 'Horário não informado' quando o treino não tem hora_inicio/hora_fim", () => {
    mockTreinos([{ ...TREINO, hora_inicio: undefined, hora_fim: undefined }]);
    render(<TreinoDetailView treinoId="tr1" />);

    expect(screen.getByText("Horário não informado")).toBeInTheDocument();
  });

  it("mostra alerta quando a listagem de matrículas falha, sem renderizar o checklist", () => {
    mockMatriculas(undefined, { isError: true, error: new Error("erro ao buscar matrículas") } as never);
    render(<TreinoDetailView treinoId="tr1" />);

    expect(screen.getByText(/erro ao carregar matrículas da turma: erro ao buscar matrículas/i)).toBeInTheDocument();
    // achado de code-review documentado no componente: erro de fetch não deve
    // cair no fallback "Nenhum atleta matriculado" do FrequenciaForm.
    expect(screen.queryByText(/nenhum atleta com matrícula ativa/i)).not.toBeInTheDocument();
  });

  it("mostra alerta quando a listagem de frequências falha, sem renderizar o checklist", () => {
    mockFrequencias(undefined, { isError: true, error: new Error("erro ao buscar frequências") } as never);
    render(<TreinoDetailView treinoId="tr1" />);

    expect(screen.getByText(/erro ao carregar frequências já lançadas: erro ao buscar frequências/i)).toBeInTheDocument();
  });

  it("avisa quando a lista de matrículas foi truncada (mais de 500 ativas)", () => {
    mockedUseMatriculas.mockReturnValue({
      data: { data: MATRICULAS, pagination: { total: 600, page: 1, per_page: 500 } },
      isLoading: false,
      isError: false,
    } as unknown as ReturnType<typeof useMatriculas>);

    render(<TreinoDetailView treinoId="tr1" />);

    expect(screen.getByText(/esta turma tem 600 matrículas ativas/i)).toBeInTheDocument();
  });

  it("mostra o resumo 'Já lançado' com a contagem por tipo de presença", () => {
    mockFrequencias([
      { id: "f1", treino_id: "tr1", atleta_id: "11111111-1111-1111-1111-111111111111", presenca: "PRESENTE", registrado_em: "2026-08-20T10:00:00Z" },
    ]);
    render(<TreinoDetailView treinoId="tr1" />);

    expect(screen.getByText("Já lançado:")).toBeInTheDocument();
    expect(screen.getByText("×1")).toBeInTheDocument();
  });

  it("renderiza o checklist de frequência quando tudo carregou sem erro", () => {
    render(<TreinoDetailView treinoId="tr1" />);

    expect(screen.getByRole("button", { name: /salvar frequência/i })).toBeInTheDocument();
  });

  it("lança a frequência e mostra a mensagem de sucesso", async () => {
    mutateAsync.mockResolvedValue({ treino_id: "tr1", total: 1 });
    const user = userEvent.setup();
    render(<TreinoDetailView treinoId="tr1" />);

    await user.click(screen.getByRole("button", { name: /salvar frequência/i }));

    expect(mutateAsync).toHaveBeenCalledWith({
      registros: [{ atleta_id: "11111111-1111-1111-1111-111111111111", presenca: "PRESENTE", justificativa: undefined }],
    });
    expect(await screen.findByRole("status")).toHaveTextContent("Frequência registrada com sucesso.");
  });

  it("mostra o erro do servidor quando o lançamento de frequência falha", async () => {
    mutateAsync.mockRejectedValue(new Error("treino tr1 não encontrado"));
    const user = userEvent.setup();
    render(<TreinoDetailView treinoId="tr1" />);

    await user.click(screen.getByRole("button", { name: /salvar frequência/i }));

    expect(await screen.findByText("treino tr1 não encontrado")).toBeInTheDocument();
  });
});
