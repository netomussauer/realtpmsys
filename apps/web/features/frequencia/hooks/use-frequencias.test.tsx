import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { frequenciaService } from "../services/frequencia.service";
import { useFrequencias } from "./use-frequencias";

vi.mock("../services/frequencia.service");

const mockedList = vi.mocked(frequenciaService.listFrequencias);

beforeEach(() => {
  mockedList.mockReset();
});

describe("useFrequencias", () => {
  it("busca as frequências do treino quando treinoId está definido", async () => {
    const response = { data: [{ id: "f1", treino_id: "tr1", atleta_id: "a1", presenca: "PRESENTE" as const, registrado_em: "2026-08-20T10:00:00Z" }] };
    mockedList.mockResolvedValue(response);

    const { result } = renderHook(() => useFrequencias("tr1"), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedList).toHaveBeenCalledWith("tr1");
    expect(result.current.data).toEqual(response);
  });

  it("não dispara a query quando treinoId é undefined", async () => {
    renderHook(() => useFrequencias(undefined), { wrapper: QueryWrapper });

    await new Promise((r) => setTimeout(r, 10));
    expect(mockedList).not.toHaveBeenCalled();
  });
});
