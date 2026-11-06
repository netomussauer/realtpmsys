import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ContaDTO } from "@/features/contas/types/conta.types";
import { ContaTable } from "./conta-table";

function conta(overrides: Partial<ContaDTO> = {}): ContaDTO {
  return {
    id: "u1",
    email: "ana@example.com",
    nome: "Ana Souza",
    perfil: "TREINADOR",
    ativo: true,
    deve_trocar_senha: false,
    criado_em: "2026-01-01T00:00:00Z",
    atualizado_em: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const pagination = { total: 1, page: 1, per_page: 20 };

describe("ContaTable", () => {
  it("mostra o skeleton enquanto carrega e a lista ainda está vazia", () => {
    const { container } = render(<ContaTable contas={[]} pagination={pagination} onPageChange={vi.fn()} isLoading />);

    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("mostra mensagem de vazio", () => {
    render(<ContaTable contas={[]} pagination={{ total: 0, page: 1, per_page: 20 }} onPageChange={vi.fn()} />);

    expect(screen.getByText("Nenhuma conta encontrada")).toBeInTheDocument();
  });

  it("mostra nome, e-mail, perfil e status, com link para o detalhe", () => {
    render(<ContaTable contas={[conta()]} pagination={pagination} onPageChange={vi.fn()} />);

    const link = screen.getByRole("link", { name: "Ana Souza" });
    expect(link).toHaveAttribute("href", "/contas/u1");
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("Treinador")).toBeInTheDocument();
    expect(screen.getByText("Ativa")).toBeInTheDocument();
  });

  it("sem nome, usa o e-mail como rótulo (sem repeti-lo embaixo)", () => {
    render(<ContaTable contas={[conta({ nome: "" })]} pagination={pagination} onPageChange={vi.fn()} />);

    expect(screen.getAllByText("ana@example.com")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "ana@example.com" })).toBeInTheDocument();
  });

  it("sinaliza conta inativa e senha temporária pendente", () => {
    render(
      <ContaTable
        contas={[conta({ ativo: false, deve_trocar_senha: true })]}
        pagination={pagination}
        onPageChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Inativa")).toBeInTheDocument();
    expect(screen.getByText("Senha temporária")).toBeInTheDocument();
  });

  it("pagina: mostra o intervalo e dispara onPageChange", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <ContaTable
        contas={[conta()]}
        pagination={{ total: 45, page: 2, per_page: 20 }}
        onPageChange={onPageChange}
      />,
    );

    expect(screen.getByText(/de/, { selector: "p" })).toHaveTextContent("21–40 de 45");

    await user.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole("button", { name: "Página anterior" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it("desabilita Anterior na primeira página e Próxima na última", () => {
    const { rerender } = render(
      <ContaTable contas={[conta()]} pagination={{ total: 30, page: 1, per_page: 20 }} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeDisabled();

    rerender(
      <ContaTable contas={[conta()]} pagination={{ total: 30, page: 2, per_page: 20 }} onPageChange={vi.fn()} />,
    );
    expect(screen.getByRole("button", { name: "Próxima página" })).toBeDisabled();
  });
});
