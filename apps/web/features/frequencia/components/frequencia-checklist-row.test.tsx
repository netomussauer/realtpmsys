import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { describe, expect, it, vi } from "vitest";
import { useAtleta } from "@/features/atletas/hooks/use-atleta";
import { frequenciaLoteSchema, type FrequenciaLoteFormData } from "@/features/frequencia/schemas/frequencia.schema";
import { FrequenciaChecklistRow } from "./frequencia-checklist-row";

vi.mock("@/features/atletas/hooks/use-atleta");

const mockedUseAtleta = vi.mocked(useAtleta);

function mockAtleta(nome: string | undefined, isLoading = false) {
  mockedUseAtleta.mockReturnValue({
    data: nome ? { nome } : undefined,
    isLoading,
  } as unknown as ReturnType<typeof useAtleta>);
}

function Harness({ atletaId, onSubmit }: { atletaId: string; onSubmit: (d: FrequenciaLoteFormData) => void }) {
  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FrequenciaLoteFormData>({
    resolver: zodResolver(frequenciaLoteSchema),
    defaultValues: { registros: [{ atleta_id: atletaId, presenca: "PRESENTE" }] },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <table>
        <tbody>
          <FrequenciaChecklistRow index={0} atletaId={atletaId} control={control} register={register} errors={errors} />
        </tbody>
      </table>
      <button type="submit">Salvar</button>
    </form>
  );
}

describe("FrequenciaChecklistRow", () => {
  it("mostra 'Carregando...' enquanto o atleta não resolveu", () => {
    mockAtleta(undefined, true);
    render(<Harness atletaId="123e4567-e89b-12d3-a456-426614174000" onSubmit={vi.fn()} />);

    expect(screen.getByText("Carregando...")).toBeInTheDocument();
  });

  it("mostra o nome do atleta resolvido e usa esse nome no aria-label do select de presença", () => {
    mockAtleta("João Silva");
    render(<Harness atletaId="123e4567-e89b-12d3-a456-426614174000" onSubmit={vi.fn()} />);

    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Presença de João Silva" })).toBeInTheDocument();
  });

  it("não mostra campo de justificativa quando a presença não é JUSTIFICADO", () => {
    mockAtleta("João Silva");
    render(<Harness atletaId="123e4567-e89b-12d3-a456-426614174000" onSubmit={vi.fn()} />);

    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/motivo da ausência/i)).not.toBeInTheDocument();
  });

  it("mostra o campo de justificativa ao selecionar JUSTIFICADO", async () => {
    mockAtleta("João Silva");
    const user = userEvent.setup();
    render(<Harness atletaId="123e4567-e89b-12d3-a456-426614174000" onSubmit={vi.fn()} />);

    await user.selectOptions(screen.getByRole("combobox"), "JUSTIFICADO");

    expect(screen.getByPlaceholderText(/motivo da ausência/i)).toBeInTheDocument();
  });

  it("exibe erro e aria-invalid quando presença é JUSTIFICADO e a justificativa fica vazia ao submeter", async () => {
    mockAtleta("João Silva");
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness atletaId="123e4567-e89b-12d3-a456-426614174000" onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByRole("combobox"), "JUSTIFICADO");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    const justificativaInput = await screen.findByPlaceholderText(/motivo da ausência/i);
    expect(justificativaInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Justificativa é obrigatória quando a presença é Justificado")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("chama onSubmit com a presença e justificativa preenchidas", async () => {
    mockAtleta("João Silva");
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<Harness atletaId="123e4567-e89b-12d3-a456-426614174000" onSubmit={onSubmit} />);

    await user.selectOptions(screen.getByRole("combobox"), "JUSTIFICADO");
    await user.type(screen.getByPlaceholderText(/motivo da ausência/i), "Atestado médico");
    await user.click(screen.getByRole("button", { name: /salvar/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      { registros: [{ atleta_id: "123e4567-e89b-12d3-a456-426614174000", presenca: "JUSTIFICADO", justificativa: "Atestado médico" }] },
      expect.anything(),
    );
  });
});
