"use client";

import { useState } from "react";
import { Ban, Wallet } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { formatDateBR, formatCurrencyBRL } from "@/shared/lib/format";
import { useAtleta } from "@/features/atletas/hooks/use-atleta";
import { usePagarMensalidade, useCancelarMensalidade } from "@/features/financeiro/hooks/use-mutations";
import type { MensalidadeDTO } from "@/features/financeiro/types/financeiro.types";
import type { PagamentoFormData } from "@/features/financeiro/schemas/pagamento.schema";
import { MensalidadeStatusBadge } from "./status-badge";
import { PagamentoForm } from "./pagamento-form";

interface MensalidadeRowProps {
  mensalidade: MensalidadeDTO;
  /** ADMIN — controla se a coluna/ações de escrita aparecem. */
  canManage: boolean;
  /** Número de colunas da tabela — usado no colSpan da linha de formulário expandida. */
  colSpan: number;
}

const MES_LABELS = [
  "",
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

/**
 * Linha da tabela de mensalidades — resolve o nome do atleta via
 * `useAtleta(atleta_id)` (mesmo padrão de
 * features/turmas/components/matricula-table.tsx e
 * features/frequencia/components/frequencia-checklist-row.tsx: nenhum
 * sub-recurso financeiro devolve `atleta_nome`, cada linha busca/reaproveita
 * o cache de `["atletas","detail",id]`).
 *
 * Ações de pagar/cancelar só aparecem para PENDENTE/VENCIDO — bate com a
 * máquina de estados do backend (mensalidade PAGA não pode ser cancelada;
 * PAGO/CANCELADO/ISENTO são terminais nesta UI).
 */
export function MensalidadeRow({ mensalidade: m, canManage, colSpan }: MensalidadeRowProps) {
  const atletaQuery = useAtleta(m.atleta_id);
  const [showPagamento, setShowPagamento] = useState(false);
  const [pagamentoError, setPagamentoError] = useState<string | null>(null);
  const [cancelarError, setCancelarError] = useState<string | null>(null);

  const pagar = usePagarMensalidade();
  const cancelar = useCancelarMensalidade();

  const podeAgir = m.status === "PENDENTE" || m.status === "VENCIDO";
  const nomeAtleta = atletaQuery.data?.nome ?? m.atleta_id;

  // Alterna o form de pagamento e limpa o erro de uma tentativa anterior —
  // achado de code-review: fechar/reabrir via este botão (em vez do "Cancelar"
  // do próprio form) deixava a mensagem de erro antiga visível na reabertura.
  const handleTogglePagamento = () => {
    setShowPagamento((v) => !v);
    setPagamentoError(null);
  };

  const handleCancelar = () => {
    if (!window.confirm(`Cancelar a mensalidade de ${nomeAtleta} (${MES_LABELS[m.competencia_mes]}/${m.competencia_ano})?`)) {
      return;
    }
    setCancelarError(null);
    cancelar.mutate(m.id, {
      onError: (e) => setCancelarError((e as Error).message),
    });
  };

  const onSubmitPagamento = async (data: PagamentoFormData) => {
    setPagamentoError(null);
    try {
      await pagar.mutateAsync({ id: m.id, data });
      setShowPagamento(false);
    } catch (e) {
      setPagamentoError((e as Error).message);
    }
  };

  return (
    <>
      <tr className="text-sm hover:bg-muted/30">
        <td className="px-4 py-3 font-medium text-foreground">
          {atletaQuery.isLoading ? "Carregando..." : nomeAtleta}
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          {MES_LABELS[m.competencia_mes] ?? m.competencia_mes}/{m.competencia_ano}
        </td>
        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
          {formatDateBR(m.data_vencimento)}
        </td>
        <td className="px-4 py-3 text-foreground">{formatCurrencyBRL(m.valor)}</td>
        <td className="px-4 py-3">
          <MensalidadeStatusBadge status={m.status} />
        </td>
        {canManage && (
          <td className="px-4 py-3 text-right">
            {podeAgir && (
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Registrar pagamento de ${nomeAtleta}`}
                  onClick={handleTogglePagamento}
                >
                  <Wallet className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Cancelar mensalidade de ${nomeAtleta}`}
                  disabled={cancelar.isPending}
                  onClick={handleCancelar}
                >
                  <Ban className="h-4 w-4" />
                </Button>
              </div>
            )}
          </td>
        )}
      </tr>

      {cancelarError && (
        <tr className="border-b border-border bg-destructive/10">
          <td colSpan={colSpan} className="px-4 py-2">
            <p role="alert" className="text-sm text-destructive">
              Erro ao cancelar: {cancelarError}
            </p>
          </td>
        </tr>
      )}

      {showPagamento && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={colSpan} className="px-4 py-4">
            <PagamentoForm
              valorSugerido={m.valor}
              serverError={pagamentoError}
              isSubmitting={pagar.isPending}
              onSubmit={onSubmitPagamento}
              onCancel={() => {
                setShowPagamento(false);
                setPagamentoError(null);
              }}
            />
          </td>
        </tr>
      )}
    </>
  );
}
