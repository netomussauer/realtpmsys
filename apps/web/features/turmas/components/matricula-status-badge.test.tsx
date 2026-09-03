import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MatriculaStatus } from "@/features/turmas/types/turma.types";
import { MatriculaStatusBadge } from "./matricula-status-badge";

describe("MatriculaStatusBadge", () => {
  const casos: { status: MatriculaStatus; label: string }[] = [
    { status: "ATIVA", label: "Ativa" },
    { status: "CANCELADA", label: "Cancelada" },
    { status: "TRANSFERIDA", label: "Transferida" },
  ];

  it.each(casos)("exibe o rótulo em português para o status $status", ({ status, label }) => {
    render(<MatriculaStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("aplica className adicional recebida via prop", () => {
    render(<MatriculaStatusBadge status="CANCELADA" className="minha-classe" />);
    expect(screen.getByText("Cancelada")).toHaveClass("minha-classe");
  });
});
