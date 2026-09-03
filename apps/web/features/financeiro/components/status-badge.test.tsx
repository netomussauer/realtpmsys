import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MensalidadeStatusBadge } from "./status-badge";
import { MENSALIDADE_STATUS } from "@/features/financeiro/types/financeiro.types";

describe("MensalidadeStatusBadge", () => {
  it.each([
    ["PENDENTE", "Pendente"],
    ["PAGO", "Pago"],
    ["VENCIDO", "Vencido"],
    ["CANCELADO", "Cancelado"],
    ["ISENTO", "Isento"],
  ] as const)("exibe o rótulo em português para o status %s", (status, label) => {
    render(<MensalidadeStatusBadge status={status} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("cobre um rótulo para cada status conhecido do domínio", () => {
    expect(MENSALIDADE_STATUS).toHaveLength(5);
  });
});
