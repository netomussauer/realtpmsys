import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTreinadoresAtivos, useCamposAtivos } from "@/features/turmas/hooks/use-picker-data";
import { TurmaForm } from "./turma-form";

vi.mock("@/features/turmas/hooks/use-picker-data");

const mockedUseTreinadoresAtivos = vi.mocked(useTreinadoresAtivos);
const mockedUseCamposAtivos = vi.mocked(useCamposAtivos);

// Rótulos de "horarios.N.*" são reaproveitados por linha do useFieldArray —
// como os testes deste arquivo nunca têm mais de uma linha simultânea, o
// texto do label é único no DOM em cada consulta.
const LABELS: Record<string, RegExp> = {
  nome: /nome da turma/i,
  faixa_etaria_min: /^idade mínima/i,
  faixa_etaria_max: /^idade máxima/i,
  capacidade_max: /capacidade máxima/i,
  treinador_id: /^treinador$/i,
  campo_id: /^campo$/i,
  "horarios.0.dia_semana": /dia da semana/i,
  "horarios.0.hora_inicio": /^hora início$/i,
  "horarios.0.hora_fim": /^hora fim$/i,
};

function byName(_container: HTMLElement, name: string): HTMLElement {
  return screen.getByLabelText(LABELS[name] ?? name, { selector: "input,select,textarea" });
}

function mockPickers() {
  mockedUseTreinadoresAtivos.mockReturnValue({
    data: [{ id: "tr1", nome: "Treinador Um" }],
    isLoading: false,
  } as unknown as ReturnType<typeof useTreinadoresAtivos>);
  mockedUseCamposAtivos.mockReturnValue({
    data: [{ id: "cp1", nome: "Campo Um" }],
    isLoading: false,
  } as unknown as ReturnType<typeof useCamposAtivos>);
}

async function preencherCamposObrigatorios(user: ReturnType<typeof userEvent.setup>, container: HTMLElement) {
  await user.type(byName(container, "nome"), "Sub-13 Manhã");
  await user.type(byName(container, "faixa_etaria_min"), "10");
  await user.type(byName(container, "faixa_etaria_max"), "13");
  await user.type(byName(container, "capacidade_max"), "20");
}

describe("TurmaForm", () => {
  beforeEach(() => {
    mockPickers();
  });

  it("exibe erro de validação quando o nome tem menos de 3 caracteres", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<TurmaForm onSubmit={onSubmit} />);

    await user.type(byName(container, "nome"), "ab");
    await user.type(byName(container, "faixa_etaria_min"), "10");
    await user.type(byName(container, "faixa_etaria_max"), "13");
    await user.type(byName(container, "capacidade_max"), "20");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Nome deve ter ao menos 3 caracteres")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exibe erro de validação quando a idade máxima é menor que a mínima", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<TurmaForm onSubmit={onSubmit} />);

    await user.type(byName(container, "nome"), "Sub-13 Manhã");
    await user.type(byName(container, "faixa_etaria_min"), "15");
    await user.type(byName(container, "faixa_etaria_max"), "10");
    await user.type(byName(container, "capacidade_max"), "20");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Idade máxima deve ser maior ou igual à mínima")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("chama onSubmit com os dados coeridos (números) quando o formulário é válido", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<TurmaForm onSubmit={onSubmit} />);

    await preencherCamposObrigatorios(user, container);
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        nome: "Sub-13 Manhã",
        faixa_etaria_min: 10,
        faixa_etaria_max: 13,
        capacidade_max: 20,
        horarios: [],
      }),
      expect.anything(),
    );
  });

  it("popula os selects de treinador e campo com os dados dos pickers", () => {
    render(<TurmaForm onSubmit={vi.fn()} />);

    expect(screen.getByRole("option", { name: "Treinador Um" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Campo Um" })).toBeInTheDocument();
  });

  it("desabilita os selects de treinador/campo enquanto os pickers carregam", () => {
    mockedUseTreinadoresAtivos.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useTreinadoresAtivos>);
    mockedUseCamposAtivos.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useCamposAtivos>);

    const { container } = render(<TurmaForm onSubmit={vi.fn()} />);

    expect(byName(container, "treinador_id")).toBeDisabled();
    expect(byName(container, "campo_id")).toBeDisabled();
  });

  it("adiciona uma linha de horário ao clicar em 'Adicionar horário' e remove ao clicar no botão de remover", async () => {
    const user = userEvent.setup();
    const { container } = render(<TurmaForm onSubmit={vi.fn()} />);

    expect(screen.getByText("Nenhum horário adicionado.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /adicionar horário/i }));

    expect(screen.queryByText("Nenhum horário adicionado.")).not.toBeInTheDocument();
    expect(byName(container, "horarios.0.dia_semana")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /remover horário/i }));

    expect(screen.getByText("Nenhum horário adicionado.")).toBeInTheDocument();
  });

  it("exibe erro de validação quando um horário tem hora fim antes da hora início", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<TurmaForm onSubmit={onSubmit} />);

    await preencherCamposObrigatorios(user, container);
    await user.click(screen.getByRole("button", { name: /adicionar horário/i }));

    await user.type(byName(container, "horarios.0.hora_inicio"), "10:00");
    await user.type(byName(container, "horarios.0.hora_fim"), "09:00");

    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(await screen.findByText("Hora fim deve ser depois da hora início")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("mostra a mensagem de erro do servidor quando serverError é informado", () => {
    render(<TurmaForm onSubmit={vi.fn()} serverError="Nome de turma já existe" />);

    expect(screen.getByRole("alert")).toHaveTextContent("Nome de turma já existe");
  });

  it("desabilita os botões e mostra 'Salvando...' quando isSubmitting=true", () => {
    render(<TurmaForm onSubmit={vi.fn()} onCancel={vi.fn()} isSubmitting />);

    expect(screen.getByRole("button", { name: /salvando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
  });

  it("chama onCancel ao clicar em Cancelar", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    render(<TurmaForm onSubmit={vi.fn()} onCancel={onCancel} />);

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
