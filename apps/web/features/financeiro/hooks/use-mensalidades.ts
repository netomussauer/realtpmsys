"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { financeiroService } from "@/features/financeiro/services/financeiro.service";
import type { MensalidadeFilter } from "@/features/financeiro/types/financeiro.types";

/**
 * useMensalidades — lista paginada de mensalidades, com o `resumo`
 * financeiro embutido na mesma resposta (vide types/financeiro.types.ts).
 *
 * `placeholderData: keepPreviousData` segura a página/resumo anteriores
 * enquanto a nova carrega — evita o "blink" da tabela e dos stat tiles ao
 * trocar de página/filtro (mesmo padrão de useTurmas/useTreinos).
 *
 * `enabled` (default true) — mesmo padrão de useInadimplencia: quem chama
 * de um contexto onde nem todo perfil tem acesso a `GET /mensalidades`
 * (ex.: TREINADOR, bloqueado em router.go) deve passar `enabled: false`
 * pra evitar disparar a query e estourar 403 antes do JSX decidir
 * renderizar. A página /mensalidades em si não precisava disso até agora
 * (só ADMIN/RESPONSAVEL navegam até lá pelo Sidebar), mas o Dashboard
 * (Fase 4) é visível a todo perfil, incluindo TREINADOR.
 */
export function useMensalidades(filter: MensalidadeFilter = {}, enabled = true) {
  return useQuery({
    queryKey: ["mensalidades", "list", filter],
    queryFn: () => financeiroService.listMensalidades(filter),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/**
 * useMensalidade — detalhe de uma mensalidade por ID. Não usado na página
 * de listagem (que já tem todos os dados necessários por linha), mas
 * exposto para eventual navegação futura a uma página de detalhe.
 */
export function useMensalidade(id: string | undefined) {
  return useQuery({
    queryKey: ["mensalidades", "detail", id],
    queryFn: () => financeiroService.getMensalidade(id!),
    enabled: !!id,
  });
}
