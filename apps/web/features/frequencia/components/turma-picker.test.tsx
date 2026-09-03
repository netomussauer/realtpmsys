import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useTurmas } from "@/features/turmas/hooks/use-turmas";
import { TurmaPicker } from "./turma-picker";

vi.mock("@/features/turmas/hooks/use-turmas");

const mockedUseTurmas = vi.mocked(useTurmas);

function mockTurmas(data: Array<{ id: string; nome: string }> | undefined, isLoading = false) {
  mockedUseTurmas.mockReturnValue({
    data: data ? { data, pagination: { total: data.length, page: 1, per_page: 100 } } : undefined,
    isLoading,
  } as unknown as ReturnType<typeof useTurmas>);
}

describe("TurmaPicker", () => {
  it("busca turmas com per_page: 100", () => {
    mockTurmas([]);
    render(<TurmaPicker value={undefined} onChange={vi.fn()} />);

    expect(mockedUseTurmas).toHaveBeenCalledWith({ per_page: 100 });
  });

  it("lista as turmas retornadas como opções", () => {
    mockTurmas([{ id: "t1", nome: "Sub-15" }, { id: "t2", nome: "Sub-17" }]);
    render(<TurmaPicker value={undefined} onChange={vi.fn()} />);

    expect(screen.getByRole("option", { name: "Sub-15" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Sub-17" })).toBeInTheDocument();
  });

  it("desabilita o select enquanto carrega", () => {
    mockTurmas(undefined, true);
    render(<TurmaPicker value={undefined} onChange={vi.fn()} />);

    expect(screen.getByRole("combobox")).toBeDisabled();
  });

  it("chama onChange com o id da turma selecionada", async () => {
    mockTurmas([{ id: "t1", nome: "Sub-15" }]);
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<TurmaPicker value={undefined} onChange={onChange} />);

    await user.selectOptions(screen.getByRole("combobox"), "t1");

    expect(onChange).toHaveBeenCalledWith("t1");
  });
});
