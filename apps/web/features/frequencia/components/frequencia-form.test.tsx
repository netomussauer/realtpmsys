import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAtleta } from "@/features/atletas/hooks/use-atleta";
import type { MatriculaDTO } from "@/features/turmas/types/turma.types";
import type { FrequenciaDTO } from "@/features/frequencia/types/frequencia.types";
import { FrequenciaForm } from "./frequencia-form";

vi.mock("@/features/atletas/hooks/use-atleta");

const mockedUseAtleta = vi.mocked(useAtleta);

const MATRICULAS: MatriculaDTO[] = [
  { id: "mat1", atleta_id: "11111111-1111-1111-1111-111111111111", turma_id: "t1", data_inicio: "2026-01-01", status: "ATIVA" },
  { id: "mat2", atleta_id: "22222222-2222-2222-2222-222222222222", turma_id: "t1", data_inicio: "2026-01-01", status: "ATIVA" },
];

describe("FrequenciaForm", () => {
  beforeEach(() => {
    mockedUseAtleta.mockImplementation((id) => ({
      data: { nome: id === "11111111-1111-1111-1111-111111111111" ? "João Silva" : "Maria Souza" },
      isLoading: false,
    }) as unknown as ReturnType<typeof useAtleta>);
  });

  it("mostra mensagem de vazio quando não há matrículas ativas", () => {
    render(<FrequenciaForm matriculas={[]} existentes={[]} onSubmit={vi.fn()} />);

    expect(
      screen.getByText("Nenhum atleta com matrícula ativa nesta turma — não há frequência para lançar."),
    ).toBeInTheDocument();
  });

  it("renderiza uma linha por atleta matriculado, com 'Presente' como padrão", () => {
    render(<FrequenciaForm matriculas={MATRICULAS} existentes={[]} onSubmit={vi.fn()} />);

    const selects = screen.getAllByRole("combobox");
    expect(selects).toHaveLength(2);
    for (const select of selects) {
      expect(select).toHaveValue("PRESENTE");
    }
  });

  it("pré-preenche com as frequências já lançadas (existentes) em vez do padrão", () => {
    const existentes: FrequenciaDTO[] = [
      { id: "f1", treino_id: "tr1", atleta_id: "11111111-1111-1111-1111-111111111111", presenca: "AUSENTE", registrado_em: "2026-08-20T10:00:00Z" },
    ];
    render(<FrequenciaForm matriculas={MATRICULAS} existentes={existentes} onSubmit={vi.fn()} />);

    const selects = screen.getAllByRole("combobox");
    expect(selects[0]).toHaveValue("AUSENTE");
    expect(selects[1]).toHaveValue("PRESENTE");
  });

  it("chama onSubmit com um registro por atleta ao salvar", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<FrequenciaForm matriculas={MATRICULAS} existentes={[]} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: /salvar frequência/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      {
        registros: [
          { atleta_id: "11111111-1111-1111-1111-111111111111", presenca: "PRESENTE", justificativa: undefined },
          { atleta_id: "22222222-2222-2222-2222-222222222222", presenca: "PRESENTE", justificativa: undefined },
        ],
      },
      expect.anything(),
    );
  });

  it("exibe a mensagem de erro do servidor quando informada", () => {
    render(<FrequenciaForm matriculas={MATRICULAS} existentes={[]} onSubmit={vi.fn()} serverError="Falha ao salvar frequência" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Falha ao salvar frequência");
  });

  it("desabilita o botão e mostra o texto de carregamento enquanto isSubmitting", () => {
    render(<FrequenciaForm matriculas={MATRICULAS} existentes={[]} onSubmit={vi.fn()} isSubmitting />);

    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
  });
});
