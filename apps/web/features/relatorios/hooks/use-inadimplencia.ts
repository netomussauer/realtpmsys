"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { relatorioService } from "@/features/relatorios/services/relatorio.service";
import type { InadimplenciaFilter } from "@/features/relatorios/types/relatorio.types";

/**
 * useInadimplencia — GET /relatorios/inadimplencia?competencia_ano=&
 * competencia_mes= (ambos opcionais — omitir os dois traz todas as
 * competências em aberto). Sem `enabled` condicional *de filtro*: diferente
 * dos relatórios de frequência, este não exige nenhum filtro pra ser útil.
 *
 * MAS o endpoint é ADMIN-only no backend (`RequirePerfil("ADMIN")` em
 * router.go) — por isso o parâmetro `enabled` abaixo. Achado de
 * code-review: sem ele, a query disparava incondicionalmente assim que a
 * página `/relatorios` montava, mesmo pra um TREINADOR (que o middleware
 * já libera pra essa rota) — resultando num 403 desnecessário antes mesmo
 * da seção de Inadimplência decidir se renderiza. O chamador passa
 * `enabled: isAdmin` (vide app/(app)/relatorios/page.tsx).
 *
 * `placeholderData: keepPreviousData` segura a lista/resumo anteriores
 * enquanto o novo filtro de competência carrega — evita o "blink" dos
 * stat tiles (mesmo padrão de useMensalidades).
 */
export function useInadimplencia(filter: InadimplenciaFilter = {}, enabled = true) {
  return useQuery({
    queryKey: ["relatorios", "inadimplencia", filter],
    queryFn: () => relatorioService.getInadimplencia(filter),
    enabled,
    placeholderData: keepPreviousData,
  });
}
