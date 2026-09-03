import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AtletaDTO } from "@/features/atletas/types/atleta.types";
import { AtletaTable } from "./atleta-table";

const atletas: AtletaDTO[] = [
  {
    id: "a1",
    nome: "João da Silva",
    data_nascimento: "2010-05-20",
    idade: 15,
    status: "ATIVO",
    telefone: "21999999999",
    cpf: "12345678901",
    criado_em: "2024-01-01T00:00:00Z",
    atualizado_em: "2024-01-01T00:00:00Z",
  },
  {
    id: "a2",
    nome: "Maria Souza",
    data_nascimento: "2011-03-15",
    idade: 14,
    status: "SUSPENSO",
    telefone: null,
    cpf: null,
    criado_em: "2024-01-01T00:00:00Z",
    atualizado_em: "2024-01-01T00:00:00Z",
  },
];

const pagination = { total: 2, page: 1, per_page: 20 };

describe("AtletaTable", () => {
  it("mostra o esqueleto de carregamento quando isLoading e não há atletas", () => {
    render(<AtletaTable atletas={[]} pagination={{ total: 0, page: 1, per_page: 20 }} onPageChange={vi.fn()} isLoading />);
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("mostra a mensagem de vazio quando não há atletas e não está carregando", () => {
    render(<AtletaTable atletas={[]} pagination={{ total: 0, page: 1, per_page: 20 }} onPageChange={vi.fn()} />);
    expect(screen.getByText("Nenhum atleta encontrado")).toBeInTheDocument();
  });

  it("renderiza uma linha por atleta com nome, idade, status e fallback '—' para campos nulos", () => {
    render(<AtletaTable atletas={atletas} pagination={pagination} onPageChange={vi.fn()} />);

    expect(screen.getByRole("link", { name: "João da Silva" })).toHaveAttribute("href", "/atletas/a1");
    expect(screen.getByText("15 anos")).toBeInTheDocument();
    expect(screen.getByText("Ativo")).toBeInTheDocument();
    expect(screen.getByText("Suspenso")).toBeInTheDocument();
    expect(screen.getByText("21999999999")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(2); // telefone e cpf nulos da Maria
  });

  it("mostra o resumo de paginação 'Mostrando X–Y de Z'", () => {
    render(<AtletaTable atletas={atletas} pagination={pagination} onPageChange={vi.fn()} />);
    expect(screen.getByText(/Mostrando/)).toHaveTextContent("Mostrando 1–2 de 2");
  });

  it("desabilita 'Página anterior' na primeira página e chama onPageChange na 'Próxima página'", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<AtletaTable atletas={atletas} pagination={{ total: 40, page: 1, per_page: 20 }} onPageChange={onPageChange} />);

    expect(screen.getByRole("button", { name: /página anterior/i })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: /próxima página/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("desabilita 'Próxima página' na última página", () => {
    render(<AtletaTable atletas={atletas} pagination={{ total: 40, page: 2, per_page: 20 }} onPageChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /próxima página/i })).toBeDisabled();
  });
});
