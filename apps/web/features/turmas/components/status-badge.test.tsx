import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TurmaStatus } from "@/features/turmas/types/turma.types";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  const casos: { status: TurmaStatus; label: string }[] = [
    { status: "ATIVA", label: "Ativa" },
    { status: "ENCERRADA", label: "Encerrada" },
    { status: "SUSPENSA", label: "Suspensa" },
  ];

  it.each(casos)("exibe o rótulo em português para o status $status", ({ status, label }) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("aplica className adicional recebida via prop", () => {
    render(<StatusBadge status="ATIVA" className="minha-classe" />);
    expect(screen.getByText("Ativa")).toHaveClass("minha-classe");
  });
});
