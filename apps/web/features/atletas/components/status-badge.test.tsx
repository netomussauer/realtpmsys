import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("mostra o rótulo 'Ativo' para status ATIVO", () => {
    render(<StatusBadge status="ATIVO" />);
    expect(screen.getByText("Ativo")).toBeInTheDocument();
  });

  it("mostra o rótulo 'Inativo' para status INATIVO", () => {
    render(<StatusBadge status="INATIVO" />);
    expect(screen.getByText("Inativo")).toBeInTheDocument();
  });

  it("mostra o rótulo 'Suspenso' para status SUSPENSO", () => {
    render(<StatusBadge status="SUSPENSO" />);
    expect(screen.getByText("Suspenso")).toBeInTheDocument();
  });
});
