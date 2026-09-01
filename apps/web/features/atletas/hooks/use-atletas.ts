"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { atletaService } from "@/features/atletas/services/atleta.service";
import type { AtletaFilter } from "@/features/atletas/types/atleta.types";

/**
 * useAtletas — lista paginada de atletas com filtros.
 *
 * `placeholderData: keepPreviousData` segura a página antiga enquanto a
 * nova carrega — evita o "blink" da tabela ficar vazia ao trocar de
 * página/filtro. Stale 30s do default global (providers.tsx).
 *
 * Query key inclui o filter inteiro → cada combinação tem cache próprio.
 *
 * `enabled` (default true) — mesmo padrão de useInadimplencia: quem chama
 * de um contexto onde nem todo perfil tem acesso a `GET /atletas` (ex.:
 * RESPONSAVEL, bloqueado em router.go) deve passar `enabled: false` pra
 * evitar disparar a query e estourar 403 antes do JSX decidir renderizar.
 */
export function useAtletas(filter: AtletaFilter = {}, enabled = true) {
  return useQuery({
    queryKey: ["atletas", "list", filter],
    queryFn: () => atletaService.list(filter),
    placeholderData: keepPreviousData,
    enabled,
  });
}
