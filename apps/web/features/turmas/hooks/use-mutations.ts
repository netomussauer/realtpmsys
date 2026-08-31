"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { turmaService } from "@/features/turmas/services/turma.service";
import type {
  TurmaDTO,
  AcaoStatusTurma,
  MatriculaDTO,
} from "@/features/turmas/types/turma.types";
import type { TurmaFormData } from "@/features/turmas/schemas/turma.schema";
import type { MatriculaFormData } from "@/features/turmas/schemas/matricula.schema";

/**
 * Mutations da feature turmas — concentradas num único arquivo (mesmo
 * padrão de features/atletas/hooks/use-mutations.ts).
 *
 * Invalidação:
 *   - List: invalida `["turmas", "list"]` (todas as combinações de filtro)
 *   - Detail: invalida `["turmas", "detail", id]`
 *   - Matrículas: invalida `["turmas", "matriculas", turmaId]` (inclui a
 *     query de vagas disponíveis, que usa a mesma raiz de key) e também
 *     list/detail da turma pai (a mudança pode afetar vagas exibidas lá).
 */

export function useCriarTurma() {
  const qc = useQueryClient();
  return useMutation<TurmaDTO, Error, TurmaFormData>({
    mutationFn: (data) => turmaService.criar(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turmas", "list"] });
    },
  });
}

export function useAtualizarTurma(id: string) {
  const qc = useQueryClient();
  return useMutation<TurmaDTO, Error, TurmaFormData>({
    mutationFn: (data) => turmaService.atualizar(id, data),
    onSuccess: (updated) => {
      // Atualiza detail no cache em vez de re-fetch — economiza 1 round-trip.
      qc.setQueryData(["turmas", "detail", id], updated);
      qc.invalidateQueries({ queryKey: ["turmas", "list"] });
    },
  });
}

export function useMudarStatusTurma() {
  const qc = useQueryClient();
  return useMutation<TurmaDTO, Error, { id: string; acao: AcaoStatusTurma }>({
    mutationFn: ({ id, acao }) => turmaService.mudarStatus(id, acao),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ["turmas", "detail", id] });
      qc.invalidateQueries({ queryKey: ["turmas", "list"] });
    },
  });
}

export function useMatricularAtleta(turmaId: string) {
  const qc = useQueryClient();
  return useMutation<MatriculaDTO, Error, MatriculaFormData>({
    mutationFn: (data) => turmaService.matricular(turmaId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turmas", "matriculas", turmaId] });
      qc.invalidateQueries({ queryKey: ["turmas", "detail", turmaId] });
      qc.invalidateQueries({ queryKey: ["turmas", "list"] });
    },
  });
}

export function useCancelarMatricula(turmaId: string) {
  const qc = useQueryClient();
  return useMutation<MatriculaDTO, Error, string>({
    mutationFn: (matriculaId) => turmaService.cancelarMatricula(matriculaId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["turmas", "matriculas", turmaId] });
      qc.invalidateQueries({ queryKey: ["turmas", "detail", turmaId] });
      qc.invalidateQueries({ queryKey: ["turmas", "list"] });
    },
  });
}
