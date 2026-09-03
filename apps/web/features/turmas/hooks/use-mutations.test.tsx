import type { ReactNode } from "react";
import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createTestQueryClient, QueryWrapper } from "@/shared/test-utils/setup-query";
import { turmaService } from "@/features/turmas/services/turma.service";
import type { TurmaFormData } from "@/features/turmas/schemas/turma.schema";
import {
  useCriarTurma,
  useAtualizarTurma,
  useMudarStatusTurma,
  useMatricularAtleta,
  useCancelarMatricula,
} from "./use-mutations";

vi.mock("@/features/turmas/services/turma.service");

const mockedCriar = vi.mocked(turmaService.criar);
const mockedAtualizar = vi.mocked(turmaService.atualizar);
const mockedMudarStatus = vi.mocked(turmaService.mudarStatus);
const mockedMatricular = vi.mocked(turmaService.matricular);
const mockedCancelarMatricula = vi.mocked(turmaService.cancelarMatricula);

const turmaPayload: TurmaFormData = {
  nome: "Sub-13 Manhã",
  faixa_etaria_min: 10,
  faixa_etaria_max: 13,
  capacidade_max: 20,
  horarios: [],
};

function wrapperWithClient(client: ReturnType<typeof createTestQueryClient>) {
  return ({ children }: { children: ReactNode }) => <QueryWrapper client={client}>{children}</QueryWrapper>;
}

describe("useCriarTurma", () => {
  it("invalida a lista de turmas ao criar com sucesso", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    mockedCriar.mockResolvedValue({ id: "t1" } as never);

    const { result } = renderHook(() => useCriarTurma(), { wrapper: wrapperWithClient(client) });

    result.current.mutate(turmaPayload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedCriar).toHaveBeenCalledWith(turmaPayload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["turmas", "list"] });
  });

  it("expõe o erro quando o serviço rejeita (ex.: validação de faixa etária no backend)", async () => {
    const client = createTestQueryClient();
    mockedCriar.mockRejectedValue(new Error("faixa etária inválida"));

    const { result } = renderHook(() => useCriarTurma(), { wrapper: wrapperWithClient(client) });

    result.current.mutate(turmaPayload);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error("faixa etária inválida"));
  });
});

describe("useAtualizarTurma", () => {
  it("atualiza o cache de detail e invalida a lista ao editar com sucesso", async () => {
    const client = createTestQueryClient();
    const setQueryDataSpy = vi.spyOn(client, "setQueryData");
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const turmaAtualizada = { id: "t1", ...turmaPayload };
    mockedAtualizar.mockResolvedValue(turmaAtualizada as never);

    const { result } = renderHook(() => useAtualizarTurma("t1"), { wrapper: wrapperWithClient(client) });

    result.current.mutate(turmaPayload);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedAtualizar).toHaveBeenCalledWith("t1", turmaPayload);
    expect(setQueryDataSpy).toHaveBeenCalledWith(["turmas", "detail", "t1"], turmaAtualizada);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["turmas", "list"] });
  });
});

describe("useMudarStatusTurma", () => {
  it("invalida detail e list da turma ao mudar o status com sucesso", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    mockedMudarStatus.mockResolvedValue({ id: "t1", status: "SUSPENSA" } as never);

    const { result } = renderHook(() => useMudarStatusTurma(), { wrapper: wrapperWithClient(client) });

    result.current.mutate({ id: "t1", acao: "suspender" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedMudarStatus).toHaveBeenCalledWith("t1", "suspender");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["turmas", "detail", "t1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["turmas", "list"] });
  });

  it("expõe o erro quando a transição de status não é permitida", async () => {
    const client = createTestQueryClient();
    mockedMudarStatus.mockRejectedValue(new Error("transição de status inválida"));

    const { result } = renderHook(() => useMudarStatusTurma(), { wrapper: wrapperWithClient(client) });

    result.current.mutate({ id: "t1", acao: "reativar" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error("transição de status inválida"));
  });
});

describe("useMatricularAtleta", () => {
  it("invalida matriculas, detail e list da turma ao matricular com sucesso", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    const matricula = { id: "m1", turma_id: "t1", atleta_id: "a1", data_inicio: "2026-01-01", status: "ATIVA" };
    mockedMatricular.mockResolvedValue(matricula as never);

    const { result } = renderHook(() => useMatricularAtleta("t1"), { wrapper: wrapperWithClient(client) });

    result.current.mutate({ atleta_id: "a1", data_inicio: "2026-01-01" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedMatricular).toHaveBeenCalledWith("t1", { atleta_id: "a1", data_inicio: "2026-01-01" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["turmas", "matriculas", "t1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["turmas", "detail", "t1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["turmas", "list"] });
  });

  it("expõe o erro quando a turma está sem vagas", async () => {
    const client = createTestQueryClient();
    mockedMatricular.mockRejectedValue(new Error("turma sem vagas disponíveis"));

    const { result } = renderHook(() => useMatricularAtleta("t1"), { wrapper: wrapperWithClient(client) });

    result.current.mutate({ atleta_id: "a1", data_inicio: "2026-01-01" });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error("turma sem vagas disponíveis"));
  });
});

describe("useCancelarMatricula", () => {
  it("invalida matriculas, detail e list da turma ao cancelar com sucesso", async () => {
    const client = createTestQueryClient();
    const invalidateSpy = vi.spyOn(client, "invalidateQueries");
    mockedCancelarMatricula.mockResolvedValue({ id: "m1", status: "CANCELADA" } as never);

    const { result } = renderHook(() => useCancelarMatricula("t1"), { wrapper: wrapperWithClient(client) });

    result.current.mutate("m1");

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedCancelarMatricula).toHaveBeenCalledWith("m1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["turmas", "matriculas", "t1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["turmas", "detail", "t1"] });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["turmas", "list"] });
  });
});
