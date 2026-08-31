"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { financeiroService } from "@/features/financeiro/services/financeiro.service";
import type {
  MensalidadeDTO,
  GerarMensalidadesResponse,
  ContratoDTO,
} from "@/features/financeiro/types/financeiro.types";
import type { PagamentoFormData } from "@/features/financeiro/schemas/pagamento.schema";
import type { GerarMensalidadesFormData } from "@/features/financeiro/schemas/gerar-mensalidades.schema";
import type { ContratoFormData } from "@/features/financeiro/schemas/contrato.schema";

/**
 * Mutations da feature financeiro — concentradas num único arquivo (mesmo
 * padrão de features/turmas/hooks/use-mutations.ts e
 * features/frequencia/hooks/use-mutations.ts).
 *
 * Invalidação: listas de mensalidades (`["mensalidades","list"]`) cobrem
 * todas as combinações de filtro/página em cache — inclui o `resumo`
 * embutido na resposta, então pagar/cancelar sempre refletem nos stat
 * tiles. Sem optimistic update aqui (diferente do exemplo do SDD): as
 * ações são feitas 1 de cada vez por um humano num formulário, o custo de
 * esperar a resposta real é baixo e evita a complexidade extra de rollback
 * pra pouco ganho de UX percebido.
 */

export function usePagarMensalidade() {
  const qc = useQueryClient();
  return useMutation<MensalidadeDTO, Error, { id: string; data: PagamentoFormData }>({
    mutationFn: ({ id, data }) => financeiroService.pagar(id, data),
    onSuccess: (updated) => {
      qc.setQueryData(["mensalidades", "detail", updated.id], updated);
      qc.invalidateQueries({ queryKey: ["mensalidades", "list"] });
    },
  });
}

export function useCancelarMensalidade() {
  const qc = useQueryClient();
  return useMutation<MensalidadeDTO, Error, string>({
    mutationFn: (id) => financeiroService.cancelarMensalidade(id),
    onSuccess: (updated) => {
      qc.setQueryData(["mensalidades", "detail", updated.id], updated);
      qc.invalidateQueries({ queryKey: ["mensalidades", "list"] });
    },
  });
}

export function useGerarMensalidades() {
  const qc = useQueryClient();
  return useMutation<GerarMensalidadesResponse, Error, GerarMensalidadesFormData>({
    mutationFn: (data) => financeiroService.gerarMensalidades(data),
    onSuccess: () => {
      // Geração em lote cria mensalidades novas — invalida a lista inteira
      // (não dá pra fazer setQueryData pontual, a resposta é só um resumo).
      qc.invalidateQueries({ queryKey: ["mensalidades", "list"] });
    },
  });
}

/**
 * useFirmarContrato — sem invalidação de cache de "lista de contratos":
 * não existe tal lista no backend (só POST /contratos). Nada a invalidar
 * além do que o próprio chamador decidir fazer com a resposta (vide
 * app/(app)/atletas/[id]/page.tsx, que mostra uma mensagem de confirmação
 * em vez de navegar para "ver o contrato").
 */
export function useFirmarContrato(atletaId: string) {
  return useMutation<ContratoDTO, Error, ContratoFormData>({
    mutationFn: (data) => financeiroService.firmarContrato(atletaId, data),
  });
}
