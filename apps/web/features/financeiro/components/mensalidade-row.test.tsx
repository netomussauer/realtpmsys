import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAtleta } from "@/features/atletas/hooks/use-atleta";
import { usePagarMensalidade, useCancelarMensalidade } from "@/features/financeiro/hooks/use-mutations";
import type { MensalidadeDTO } from "@/features/financeiro/types/financeiro.types";
import { MensalidadeRow } from "./mensalidade-row";

vi.mock("@/features/atletas/hooks/use-atleta");
vi.mock("@/features/financeiro/hooks/use-mutations");

const mockedUseAtleta = vi.mocked(useAtleta);
const mockedUsePagar = vi.mocked(usePagarMensalidade);
const mockedUseCancelar = vi.mocked(useCancelarMensalidade);

const MENSALIDADE: MensalidadeDTO = {
  id: "m1",
  atleta_id: "a1",
  competencia_ano: 2026,
  competencia_mes: 8,
  data_vencimento: "2026-08-10",
  valor: "150.00",
  status: "PENDENTE",
};

function mockAtleta(nome: string | undefined, isLoading = false) {
  mockedUseAtleta.mockReturnValue({
    data: nome ? { nome } : undefined,
    isLoading,
  } as unknown as ReturnType<typeof useAtleta>);
}

function renderRow(mensalidade: MensalidadeDTO, canManage = true) {
  return render(
    <table>
      <tbody>
        <MensalidadeRow mensalidade={mensalidade} canManage={canManage} colSpan={6} />
      </tbody>
    </table>,
  );
}

describe("MensalidadeRow", () => {
  const mutateAsyncPagar = vi.fn();
  const mutatePagar = vi.fn();
  const mutateCancelar = vi.fn();

  beforeEach(() => {
    mutateAsyncPagar.mockReset();
    mutatePagar.mockReset();
    mutateCancelar.mockReset();
    mockedUsePagar.mockReturnValue({
      mutateAsync: mutateAsyncPagar,
      mutate: mutatePagar,
      isPending: false,
    } as unknown as ReturnType<typeof usePagarMensalidade>);
    mockedUseCancelar.mockReturnValue({
      mutate: mutateCancelar,
      isPending: false,
    } as unknown as ReturnType<typeof useCancelarMensalidade>);
    mockAtleta("João Silva");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("mostra o nome do atleta resolvido via useAtleta", () => {
    renderRow(MENSALIDADE);
    expect(screen.getByText("João Silva")).toBeInTheDocument();
  });

  it("mostra 'Carregando...' enquanto o atleta não resolveu", () => {
    mockAtleta(undefined, true);
    renderRow(MENSALIDADE);
    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("mostra as ações de pagar/cancelar quando pode gerenciar e o status permite ação", () => {
    renderRow(MENSALIDADE, true);
    expect(screen.getByRole("button", { name: /registrar pagamento de joão silva/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar mensalidade de joão silva/i })).toBeInTheDocument();
  });

  it("não mostra ações quando canManage=false", () => {
    renderRow(MENSALIDADE, false);
    expect(screen.queryByRole("button", { name: /registrar pagamento/i })).not.toBeInTheDocument();
  });

  it("não mostra ações quando o status não permite ação (PAGO)", () => {
    renderRow({ ...MENSALIDADE, status: "PAGO" }, true);
    expect(screen.queryByRole("button", { name: /registrar pagamento/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancelar mensalidade/i })).not.toBeInTheDocument();
  });

  it("abre o formulário de pagamento ao clicar no botão", async () => {
    const user = userEvent.setup();
    renderRow(MENSALIDADE);

    await user.click(screen.getByRole("button", { name: /registrar pagamento de joão silva/i }));

    expect(screen.getByRole("button", { name: /confirmar pagamento/i })).toBeInTheDocument();
  });

  it("chama pagar.mutateAsync ao submeter o formulário de pagamento e fecha o form", async () => {
    const user = userEvent.setup();
    mutateAsyncPagar.mockResolvedValue(undefined);
    renderRow(MENSALIDADE);

    await user.click(screen.getByRole("button", { name: /registrar pagamento de joão silva/i }));
    await user.selectOptions(screen.getByRole("combobox"), "PIX");
    await user.click(screen.getByRole("button", { name: /confirmar pagamento/i }));

    expect(mutateAsyncPagar).toHaveBeenCalledWith({
      id: "m1",
      data: expect.objectContaining({ forma_pagamento: "PIX" }),
    });

    // Form fecha após sucesso — o botão "Confirmar pagamento" não deve mais existir.
    await screen.findByRole("button", { name: /registrar pagamento de joão silva/i });
    expect(screen.queryByRole("button", { name: /confirmar pagamento/i })).not.toBeInTheDocument();
  });

  it("mostra o erro do servidor quando o pagamento falha e mantém o formulário aberto", async () => {
    const user = userEvent.setup();
    mutateAsyncPagar.mockRejectedValue(new Error("valor divergente"));
    renderRow(MENSALIDADE);

    await user.click(screen.getByRole("button", { name: /registrar pagamento de joão silva/i }));
    await user.selectOptions(screen.getByRole("combobox"), "PIX");
    await user.click(screen.getByRole("button", { name: /confirmar pagamento/i }));

    expect(await screen.findByText("valor divergente")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar pagamento/i })).toBeInTheDocument();
  });

  it("pede confirmação e chama cancelar.mutate ao confirmar o cancelamento", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderRow(MENSALIDADE);

    await user.click(screen.getByRole("button", { name: /cancelar mensalidade de joão silva/i }));

    expect(window.confirm).toHaveBeenCalledWith("Cancelar a mensalidade de João Silva (Ago/2026)?");
    expect(mutateCancelar).toHaveBeenCalledWith("m1", expect.objectContaining({ onError: expect.any(Function) }));
  });

  it("não chama cancelar.mutate quando a confirmação é recusada", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    renderRow(MENSALIDADE);

    await user.click(screen.getByRole("button", { name: /cancelar mensalidade de joão silva/i }));

    expect(mutateCancelar).not.toHaveBeenCalled();
  });

  it("mostra o erro de cancelamento retornado pelo onError da mutation", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    mutateCancelar.mockImplementation((_id, opts) => {
      opts?.onError?.(new Error("mensalidade já paga"));
    });
    renderRow(MENSALIDADE);

    await user.click(screen.getByRole("button", { name: /cancelar mensalidade de joão silva/i }));

    expect(await screen.findByText(/erro ao cancelar: mensalidade já paga/i)).toBeInTheDocument();
  });
});
