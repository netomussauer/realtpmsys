import { renderHook, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { createTestQueryClient } from "@/shared/test-utils/setup-query";
import { frequenciaService } from "../services/frequencia.service";
import { useCriarTreino, useLancarFrequencias } from "./use-mutations";

vi.mock("../services/frequencia.service");

const mockedCriar = vi.mocked(frequenciaService.criarTreino);
const mockedLancar = vi.mocked(frequenciaService.lancarFrequencias);

function wrapperWithClient(client: ReturnType<typeof createTestQueryClient>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

describe("useCriarTreino", () => {
  it("chama frequenciaService.criarTreino com o turmaId do hook e invalida a lista de treinos daquela turma", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const dto = { id: "tr1", turma_id: "t1", data_treino: "2026-08-20", criado_em: "2026-08-01T00:00:00Z" };
    mockedCriar.mockResolvedValue(dto);

    const { result } = renderHook(() => useCriarTreino("t1"), { wrapper: wrapperWithClient(client) });

    result.current.mutate({ data_treino: "2026-08-20" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedCriar).toHaveBeenCalledWith("t1", { data_treino: "2026-08-20" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["treinos", "list", "t1"] });
  });

  it("expõe o erro quando a criação falha (ex.: treino duplicado na mesma data)", async () => {
    mockedCriar.mockRejectedValue(new Error("já existe treino para a turma t1 na data 2026-08-20"));

    const { result } = renderHook(() => useCriarTreino("t1"), { wrapper: wrapperWithClient(createTestQueryClient()) });

    result.current.mutate({ data_treino: "2026-08-20" });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect((result.current.error as Error).message).toBe("já existe treino para a turma t1 na data 2026-08-20");
  });
});

describe("useLancarFrequencias", () => {
  it("chama frequenciaService.lancarFrequencias com o treinoId do hook e invalida a lista de frequências daquele treino", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    mockedLancar.mockResolvedValue({ treino_id: "tr1", total: 2 });

    const { result } = renderHook(() => useLancarFrequencias("tr1"), { wrapper: wrapperWithClient(client) });

    const data = {
      registros: [
        { atleta_id: "a1", presenca: "PRESENTE" as const },
        { atleta_id: "a2", presenca: "AUSENTE" as const },
      ],
    };
    result.current.mutate(data);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedLancar).toHaveBeenCalledWith("tr1", data);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["frequencias", "list", "tr1"] });
    expect(result.current.data).toEqual({ treino_id: "tr1", total: 2 });
  });
});
