"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { contaService } from "@/features/contas/services/conta.service";
import type {
  AcaoStatusConta,
  ContaComSenhaDTO,
  ContaDTO,
} from "@/features/contas/types/conta.types";
import type {
  CriarContaFormData,
  EditarContaFormData,
} from "@/features/contas/schemas/conta.schema";

/**
 * Mutations da feature contas (mesmo padrão de features/turmas).
 *
 * Invalidação: toda alteração invalida `["contas","list"]`; as que mudam uma
 * conta específica também atualizam/invalidam `["contas","detail",id]`.
 *
 * As mutations de criar e redefinir senha devolvem `senha_temporaria`. Ela
 * vive só no resultado da mutation (memória do componente) — NÃO é colocada
 * no cache do TanStack Query nem em qualquer storage.
 */

export function useCriarConta() {
  const qc = useQueryClient();
  return useMutation<ContaComSenhaDTO, Error, CriarContaFormData>({
    mutationFn: (data) => contaService.criar(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contas", "list"] });
    },
  });
}

export function useAtualizarConta(id: string) {
  const qc = useQueryClient();
  return useMutation<ContaDTO, Error, EditarContaFormData>({
    mutationFn: (data) => contaService.atualizar(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(["contas", "detail", id], updated);
      qc.invalidateQueries({ queryKey: ["contas", "list"] });
    },
  });
}

export function useMudarStatusConta() {
  const qc = useQueryClient();
  return useMutation<ContaDTO, Error, { id: string; acao: AcaoStatusConta }>({
    mutationFn: ({ id, acao }) => contaService.mudarStatus(id, acao),
    onSuccess: (updated, { id }) => {
      qc.setQueryData(["contas", "detail", id], updated);
      qc.invalidateQueries({ queryKey: ["contas", "list"] });
    },
  });
}

export function useRedefinirSenhaConta() {
  const qc = useQueryClient();
  return useMutation<ContaComSenhaDTO, Error, string>({
    mutationFn: (id) => contaService.redefinirSenha(id),
    onSuccess: (_data, id) => {
      // Só o status "deve trocar senha" mudou; a senha em si não vai ao cache.
      qc.invalidateQueries({ queryKey: ["contas", "detail", id] });
      qc.invalidateQueries({ queryKey: ["contas", "list"] });
    },
  });
}
