import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { atletaService } from "@/features/atletas/services/atleta.service";
import { AtletaPicker } from "./atleta-picker";

vi.mock("@/features/atletas/services/atleta.service");

const mockedList = vi.mocked(atletaService.list);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("AtletaPicker", () => {
  it("mostra o botão 'Trocar' quando já há um atleta selecionado, e chama onChange(null) ao clicar", () => {
    const onChange = vi.fn();
    render(
      <AtletaPicker value={{ id: "a1", nome: "João da Silva" }} onChange={onChange} />,
      { wrapper: QueryWrapper },
    );

    expect(screen.getByText("João da Silva")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /trocar/i }));

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("não busca atletas enquanto a busca tem menos de 2 caracteres", async () => {
    render(<AtletaPicker value={null} onChange={vi.fn()} />, { wrapper: QueryWrapper });

    fireEvent.change(screen.getByLabelText(/buscar atleta por nome/i), { target: { value: "J" } });
    await sleep(400);

    expect(mockedList).not.toHaveBeenCalled();
  });

  it("busca atletas (debounced) a partir de 2 caracteres e lista os resultados", async () => {
    mockedList.mockResolvedValue({
      data: [{ id: "a1", nome: "João da Silva" }],
      pagination: { total: 1, page: 1, per_page: 10 },
    } as never);
    render(<AtletaPicker value={null} onChange={vi.fn()} />, { wrapper: QueryWrapper });

    fireEvent.change(screen.getByLabelText(/buscar atleta por nome/i), { target: { value: "Jo" } });

    await waitFor(() => expect(mockedList).toHaveBeenCalledWith({ nome: "Jo", per_page: 10 }), { timeout: 2000 });
    expect(await screen.findByRole("button", { name: "João da Silva" })).toBeInTheDocument();
  });

  it("seleciona um atleta da lista, chamando onChange e limpando a busca", async () => {
    mockedList.mockResolvedValue({
      data: [{ id: "a1", nome: "João da Silva" }],
      pagination: { total: 1, page: 1, per_page: 10 },
    } as never);
    const onChange = vi.fn();
    render(<AtletaPicker value={null} onChange={onChange} />, { wrapper: QueryWrapper });

    fireEvent.change(screen.getByLabelText(/buscar atleta por nome/i), { target: { value: "Jo" } });

    const resultado = await screen.findByRole("button", { name: "João da Silva" }, { timeout: 2000 });
    fireEvent.click(resultado);

    expect(onChange).toHaveBeenCalledWith({ id: "a1", nome: "João da Silva" });
  });

  it("mostra mensagem de 'nenhum atleta encontrado' quando a busca não retorna resultados", async () => {
    mockedList.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, per_page: 10 } } as never);
    render(<AtletaPicker value={null} onChange={vi.fn()} />, { wrapper: QueryWrapper });

    fireEvent.change(screen.getByLabelText(/buscar atleta por nome/i), { target: { value: "Zzz" } });

    expect(await screen.findByText("Nenhum atleta encontrado.", {}, { timeout: 2000 })).toBeInTheDocument();
  });

  it("mostra mensagem de erro quando a busca falha", async () => {
    mockedList.mockRejectedValue(new Error("Erro ao buscar"));
    render(<AtletaPicker value={null} onChange={vi.fn()} />, { wrapper: QueryWrapper });

    fireEvent.change(screen.getByLabelText(/buscar atleta por nome/i), { target: { value: "Jo" } });

    expect(await screen.findByRole("alert", {}, { timeout: 2000 })).toHaveTextContent(
      "Erro ao buscar atletas: Erro ao buscar",
    );
  });
});
