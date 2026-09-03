import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PresencaBadge } from "./presenca-badge";

describe("PresencaBadge", () => {
  it.each([
    ["PRESENTE", "Presente"],
    ["AUSENTE", "Ausente"],
    ["JUSTIFICADO", "Justificado"],
  ] as const)("exibe o rótulo em português para a presença %s", (presenca, label) => {
    render(<PresencaBadge presenca={presenca} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });
});
