import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePermission } from "@/features/auth/hooks/use-permission";
import { useAtleta } from "@/features/atletas/hooks/use-atleta";
import { usePagarMensalidade, useCancelarMensalidade } from "@/features/financeiro/hooks/use-mutations";
import type { MensalidadeDTO } from "@/features/financeiro/types/financeiro.types";
import { MensalidadeTable } from "./mensalidade-table";

vi.mock("@/features/auth/hooks/use-permission");
vi.mock("@/features/atletas/hooks/use-atleta");
vi.mock("@/features/financeiro/hooks/use-mutations");

const mockedUsePermission = vi.mocked(usePermission);
const mockedUseAtleta = vi.mocked(useAtleta);
const mockedUsePagar = vi.mocked(usePagarMensalidade);
const mockedUseCancelar = vi.mocked(useCancelarMensalidade);

const MENSALIDADES: MensalidadeDTO[] = [
  { id: "m1", atleta_id: "a1", competencia_ano: 2026, competencia_mes: 8, data_vencimento: "2026-08-10", valor: "150.00", status: "PENDENTE" },
];

beforeEach(() => {
  mockedUseAtleta.mockReturnValue({ data: { nome: "João Silva" }, isLoading: false } as unknown as ReturnType<typeof useAtleta>);
  mockedUsePagar.mockReturnValue({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof usePagarMensalidade>);
  mockedUseCancelar.mockReturnValue({ mutate: vi.fn(), isPending: false } as unknown as ReturnType<typeof useCancelarMensalidade>);
});

describe("MensalidadeTable", () => {
  it("mostra o estado de carregamento (skeleton) quando isLoading e a lista está vazia", () => {
    mockedUsePermission.mockReturnValue(false);
    const { container } = render(
      <MensalidadeTable mensalidades={[]} pagination={{ total: 0, page: 1, per_page: 20 }} onPageChange={vi.fn()} isLoading />,
    );

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("mostra o estado vazio quando não há mensalidades", () => {
    mockedUsePermission.mockReturnValue(false);
    render(
      <MensalidadeTable mensalidades={[]} pagination={{ total: 0, page: 1, per_page: 20 }} onPageChange={vi.fn()} />,
    );

    expect(screen.getByText("Nenhuma mensalidade encontrada")).toBeInTheDocument();
  });

  it("sugere gerar mensalidades no estado vazio somente para quem pode gerenciar", () => {
    mockedUsePermission.mockReturnValue(true);
    render(
      <MensalidadeTable mensalidades={[]} pagination={{ total: 0, page: 1, per_page: 20 }} onPageChange={vi.fn()} />,
    );

    expect(screen.getByText(/ou gere as mensalidades do mês/i)).toBeInTheDocument();
  });

  it("renderiza a coluna de ações só quando canManage=true (ADMIN)", () => {
    mockedUsePermission.mockReturnValue(true);
    render(
      <MensalidadeTable mensalidades={MENSALIDADES} pagination={{ total: 1, page: 1, per_page: 20 }} onPageChange={vi.fn()} />,
    );

    expect(screen.getByRole("columnheader", { name: "Ações" })).toBeInTheDocument();
  });

  it("não renderiza a coluna de ações quando canManage=false", () => {
    mockedUsePermission.mockReturnValue(false);
    render(
      <MensalidadeTable mensalidades={MENSALIDADES} pagination={{ total: 1, page: 1, per_page: 20 }} onPageChange={vi.fn()} />,
    );

    expect(screen.queryByRole("columnheader", { name: "Ações" })).not.toBeInTheDocument();
  });

  it("mostra a contagem de paginação e desabilita 'anterior' na primeira página", () => {
    mockedUsePermission.mockReturnValue(false);
    render(
      <MensalidadeTable mensalidades={MENSALIDADES} pagination={{ total: 25, page: 1, per_page: 20 }} onPageChange={vi.fn()} />,
    );

    expect(screen.getByText(/mostrando/i).textContent).toBe("Mostrando 1–20 de 25");
    expect(screen.getByText(/página/i).textContent).toBe("Página 1 de 2");
    expect(screen.getByRole("button", { name: /página anterior/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /próxima página/i })).not.toBeDisabled();
  });

  it("chama onPageChange com a próxima página ao clicar em próxima", async () => {
    mockedUsePermission.mockReturnValue(false);
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <MensalidadeTable mensalidades={MENSALIDADES} pagination={{ total: 25, page: 1, per_page: 20 }} onPageChange={onPageChange} />,
    );

    await user.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });
});
