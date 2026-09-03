import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { usePermission } from "@/features/auth/hooks/use-permission";
import { atletaService } from "@/features/atletas/services/atleta.service";
import { MensalidadeFilterBar } from "./mensalidade-filter-bar";

vi.mock("@/features/auth/hooks/use-permission");
vi.mock("@/features/atletas/services/atleta.service");

const mockedUsePermission = vi.mocked(usePermission);
const mockedList = vi.mocked(atletaService.list);

function renderBar(value = {}) {
  const onChange = vi.fn();
  render(<MensalidadeFilterBar value={value} onChange={onChange} />, { wrapper: QueryWrapper });
  return { onChange };
}

describe("MensalidadeFilterBar", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("não mostra o campo de busca de atleta para quem não é ADMIN", () => {
    mockedUsePermission.mockReturnValue(false);
    renderBar();

    expect(screen.queryByPlaceholderText(/buscar atleta por nome/i)).not.toBeInTheDocument();
  });

  it("mostra o campo de busca de atleta para ADMIN", () => {
    mockedUsePermission.mockReturnValue(true);
    renderBar();

    expect(screen.getByPlaceholderText(/buscar atleta por nome/i)).toBeInTheDocument();
  });

  it("chama onChange com o status selecionado e reseta a página", async () => {
    mockedUsePermission.mockReturnValue(false);
    const user = userEvent.setup();
    const { onChange } = renderBar({ page: 2 });

    await user.selectOptions(screen.getByRole("combobox"), "PAGO");

    expect(onChange).toHaveBeenCalledWith({ page: 1, status: "PAGO" });
  });

  it("busca atletas após 300ms de debounce e chama onChange ao selecionar um resultado", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockedUsePermission.mockReturnValue(true);
    mockedList.mockResolvedValue({
      data: [{ id: "a1", nome: "João Silva", data_nascimento: "2010-01-01", idade: 16, status: "ATIVO" }],
      pagination: { total: 1, page: 1, per_page: 10 },
    } as never);
    const user = userEvent.setup({ delay: null });
    const { onChange } = renderBar();

    await user.type(screen.getByPlaceholderText(/buscar atleta por nome/i), "João");

    vi.advanceTimersByTime(300);
    vi.useRealTimers();

    const option = await screen.findByRole("button", { name: "João Silva" });
    await user.click(option);

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ atleta_id: "a1", page: 1 }));
  });

  it("mostra o botão Limpar somente quando há filtro ativo e reseta tudo ao clicar", async () => {
    mockedUsePermission.mockReturnValue(false);
    const user = userEvent.setup();
    const { onChange } = renderBar({ status: "PENDENTE" });

    const limpar = screen.getByRole("button", { name: /limpar/i });
    await user.click(limpar);

    expect(onChange).toHaveBeenCalledWith({ page: 1, per_page: 20 });
  });

  it("não mostra o botão Limpar quando não há filtro ativo", () => {
    mockedUsePermission.mockReturnValue(false);
    renderBar();

    expect(screen.queryByRole("button", { name: /limpar/i })).not.toBeInTheDocument();
  });
});
