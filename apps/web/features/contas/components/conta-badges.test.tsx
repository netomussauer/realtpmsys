import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PerfilBadge, SenhaTemporariaBadge, StatusContaBadge } from "./conta-badges";

describe("PerfilBadge", () => {
  it.each([
    ["ADMIN", "Administrador"],
    ["TREINADOR", "Treinador"],
    ["RESPONSAVEL", "Responsável"],
  ] as const)("%s → %s", (perfil, rotulo) => {
    render(<PerfilBadge perfil={perfil} />);
    expect(screen.getByText(rotulo)).toBeInTheDocument();
  });
});

describe("StatusContaBadge", () => {
  it("mostra Ativa e Inativa", () => {
    const { rerender } = render(<StatusContaBadge ativo />);
    expect(screen.getByText("Ativa")).toBeInTheDocument();
    rerender(<StatusContaBadge ativo={false} />);
    expect(screen.getByText("Inativa")).toBeInTheDocument();
  });
});

describe("SenhaTemporariaBadge", () => {
  it("renderiza o aviso", () => {
    render(<SenhaTemporariaBadge />);
    expect(screen.getByText("Senha temporária")).toBeInTheDocument();
  });
});
