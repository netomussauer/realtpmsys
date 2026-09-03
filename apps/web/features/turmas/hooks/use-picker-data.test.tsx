import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryWrapper } from "@/shared/test-utils/setup-query";
import { listTreinadores, listCampos } from "@/features/turmas/services/turma.service";
import { useTreinadoresAtivos, useCamposAtivos } from "./use-picker-data";

vi.mock("@/features/turmas/services/turma.service");

const mockedListTreinadores = vi.mocked(listTreinadores);
const mockedListCampos = vi.mocked(listCampos);

describe("useTreinadoresAtivos", () => {
  it("filtra client-side apenas os treinadores com status ATIVO", async () => {
    mockedListTreinadores.mockResolvedValue({
      data: [
        { id: "1", usuario_id: "u1", nome: "Ativo", status: "ATIVO", criado_em: "", atualizado_em: "" },
        { id: "2", usuario_id: "u2", nome: "Inativo", status: "INATIVO", criado_em: "", atualizado_em: "" },
      ],
      pagination: { total: 2, page: 1, per_page: 100 },
    } as never);

    const { result } = renderHook(() => useTreinadoresAtivos(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListTreinadores).toHaveBeenCalledWith({ per_page: 100 });
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].nome).toBe("Ativo");
  });
});

describe("useCamposAtivos", () => {
  it("filtra client-side apenas os campos com ativo=true", async () => {
    mockedListCampos.mockResolvedValue({
      data: [
        { id: "1", nome: "Campo A", ativo: true },
        { id: "2", nome: "Campo B", ativo: false },
      ],
      pagination: { total: 2, page: 1, per_page: 100 },
    } as never);

    const { result } = renderHook(() => useCamposAtivos(), { wrapper: QueryWrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockedListCampos).toHaveBeenCalledWith({ per_page: 100 });
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data?.[0].nome).toBe("Campo A");
  });
});
