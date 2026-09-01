"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { turmaService } from "@/features/turmas/services/turma.service";
import type { TurmaFilter } from "@/features/turmas/types/turma.types";

/**
 * useTurmas — lista paginada de turmas com filtros (status, treinador).
 *
 * `placeholderData: keepPreviousData` segura a página antiga enquanto a
 * nova carrega — evita o "blink" da tabela ficar vazia ao trocar de
 * página/filtro. Stale 30s do default global (providers.tsx).
 *
 * `enabled` (default true) — mesmo padrão de useInadimplencia: quem chama
 * de um contexto onde nem todo perfil tem acesso a `GET /turmas` (ex.:
 * RESPONSAVEL, bloqueado em router.go) deve passar `enabled: false` pra
 * evitar disparar a query e estourar 403 antes do JSX decidir renderizar.
 */
export function useTurmas(filter: TurmaFilter = {}, enabled = true) {
  return useQuery({
    queryKey: ["turmas", "list", filter],
    queryFn: () => turmaService.list(filter),
    placeholderData: keepPreviousData,
    enabled,
  });
}
