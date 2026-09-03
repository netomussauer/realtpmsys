import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { atletaService } from "@/features/atletas/services/atleta.service";
import { MatriculaForm } from "./matricula-form";

vi.mock("@/features/atletas/services/atleta.service");

const mockedList = vi.mocked(atletaService.list);
const ATLETA_ID = "3fa85f64-5717-4562-b3fc-2c963f66afa6";

beforeEach(() => {
  mockedList.mockReset();
});

function dataInicioField(): HTMLElement {
  return screen.getByLabelText(/data de início/i);
}

function renderForm(props: Partial<React.ComponentProps<typeof MatriculaForm>> = {}) {
  return render(<MatriculaForm onSubmit={vi.fn()} {...props} />, { wrapper: QueryWrapper });
}

describe("MatriculaForm", () => {
  it("exibe erro de validação quando nenhum atleta é selecionado", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });

    fireEvent.change(dataInicioField(), { target: { value: "2026-01-01" } });
    await user.click(screen.getByRole("button", { name: /matricular/i }));

    expect(await screen.findByText("Selecione um atleta")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("exibe erro de validação quando a data de início está vazia", async () => {
    mockedList.mockResolvedValue({
      data: [{ id: ATLETA_ID, nome: "João Silva" }],
      pagination: { total: 1, page: 1, per_page: 10 },
    } as never);
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText(/buscar atleta por nome/i), "João");
    await waitFor(() => expect(mockedList).toHaveBeenCalled(), { timeout: 2000 });
    await user.click(await screen.findByRole("button", { name: "João Silva" }, { timeout: 2000 }));
    await user.click(screen.getByRole("button", { name: /matricular/i }));

    expect(await screen.findByText("Data inválida (use YYYY-MM-DD)")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("não busca com menos de 2 caracteres digitados", async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText(/buscar atleta por nome/i), "J");

    expect(mockedList).not.toHaveBeenCalled();
  });

  it("busca (debounced) atletas por nome a partir de 2 caracteres e lista os resultados", async () => {
    mockedList.mockResolvedValue({
      data: [{ id: ATLETA_ID, nome: "João Silva" }],
      pagination: { total: 1, page: 1, per_page: 10 },
    } as never);
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText(/buscar atleta por nome/i), "Jo");

    await waitFor(() => expect(mockedList).toHaveBeenCalledWith({ nome: "Jo", per_page: 10 }), { timeout: 2000 });
    expect(await screen.findByRole("button", { name: "João Silva" }, { timeout: 2000 })).toBeInTheDocument();
  });

  it("exibe mensagem de nenhum resultado quando a busca não encontra atletas", async () => {
    mockedList.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, per_page: 10 } } as never);
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText(/buscar atleta por nome/i), "Zzz");

    expect(await screen.findByText("Nenhum atleta encontrado.", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("seleciona um atleta da lista, mostra o chip selecionado e permite trocar", async () => {
    mockedList.mockResolvedValue({
      data: [{ id: ATLETA_ID, nome: "João Silva" }],
      pagination: { total: 1, page: 1, per_page: 10 },
    } as never);
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByPlaceholderText(/buscar atleta por nome/i), "Jo");
    await user.click(await screen.findByRole("button", { name: "João Silva" }, { timeout: 2000 }));

    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/buscar atleta por nome/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /trocar/i }));

    expect(screen.getByPlaceholderText(/buscar atleta por nome/i)).toBeInTheDocument();
  });

  it("chama onSubmit com atleta_id e data_inicio quando o formulário é válido", async () => {
    mockedList.mockResolvedValue({
      data: [{ id: ATLETA_ID, nome: "João Silva" }],
      pagination: { total: 1, page: 1, per_page: 10 },
    } as never);
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    renderForm({ onSubmit });

    await user.type(screen.getByPlaceholderText(/buscar atleta por nome/i), "Jo");
    await user.click(await screen.findByRole("button", { name: "João Silva" }, { timeout: 2000 }));
    fireEvent.change(dataInicioField(), { target: { value: "2026-01-01" } });
    await user.click(screen.getByRole("button", { name: /matricular/i }));

    await vi.waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ atleta_id: ATLETA_ID, data_inicio: "2026-01-01" }),
        expect.anything(),
      ),
    );
  });

  it("mostra a mensagem de erro do servidor quando serverError é informado", () => {
    renderForm({ serverError: "Turma sem vagas disponíveis" });

    expect(screen.getByRole("alert")).toHaveTextContent("Turma sem vagas disponíveis");
  });

  it("desabilita os botões e mostra 'Matriculando...' quando isSubmitting=true", () => {
    renderForm({ isSubmitting: true, onCancel: vi.fn() });

    expect(screen.getByRole("button", { name: /matriculando/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /cancelar/i })).toBeDisabled();
  });

  it("chama onCancel ao clicar em Cancelar", async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();
    renderForm({ onCancel });

    await user.click(screen.getByRole("button", { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
