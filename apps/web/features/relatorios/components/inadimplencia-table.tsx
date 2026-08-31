import { formatDateBR, formatCurrencyBRL } from "@/shared/lib/format";
import type { InadimplenciaItemDTO } from "@/features/relatorios/types/relatorio.types";

interface InadimplenciaTableProps {
  itens: InadimplenciaItemDTO[];
  isLoading?: boolean;
}

/**
 * Tabela de mensalidades em atraso — lista COMPLETA, sem paginação
 * (`GET /relatorios/inadimplencia` não devolve `pagination`; times de
 * futebol de bairro não têm volume que justifique paginar isso, e o
 * backend não pagina — vide types/relatorio.types.ts).
 *
 * `status` chega como string livre do backend (ex.: "VENCIDO",
 * "PENDENTE") — não reaproveitamos `MensalidadeStatusBadge` de
 * features/financeiro aqui: features nunca importam diretamente umas das
 * outras (regra de fronteiras do frontend-architecture.md); um badge
 * simples local resolve sem acoplar as duas features.
 */
export function InadimplenciaTable({ itens, isLoading }: InadimplenciaTableProps) {
  if (isLoading && itens.length === 0) {
    return <TableSkeleton />;
  }

  if (itens.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="font-display text-xl text-primary">Nenhuma mensalidade em atraso</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Ajuste o filtro de competência ou aguarde o próximo vencimento.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <table className="w-full">
        <caption className="sr-only">Mensalidades em atraso por atleta e competência</caption>
        <thead className="border-b border-border bg-muted/40">
          <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
            <th scope="col" className="px-4 py-3 font-medium">
              Atleta
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Competência
            </th>
            <th scope="col" className="px-4 py-3 font-medium hidden md:table-cell">
              Vencimento
            </th>
            <th scope="col" className="px-4 py-3 font-medium">
              Valor
            </th>
            <th scope="col" className="px-4 py-3 font-medium hidden sm:table-cell">
              Status
            </th>
            <th scope="col" className="px-4 py-3 font-medium text-right">
              Dias em atraso
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {itens.map((item) => (
            <tr key={item.mensalidade_id}>
              <td className="px-4 py-3">
                <p className="font-medium text-foreground">{item.atleta_nome}</p>
                {(item.atleta_telefone || item.atleta_email) && (
                  <p className="text-xs text-muted-foreground">
                    {[item.atleta_telefone, item.atleta_email].filter(Boolean).join(" · ")}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-sm text-foreground">
                {String(item.competencia_mes).padStart(2, "0")}/{item.competencia_ano}
              </td>
              <td className="px-4 py-3 text-sm text-foreground hidden md:table-cell">
                {formatDateBR(item.data_vencimento)}
              </td>
              <td className="px-4 py-3 text-sm font-medium text-destructive">
                {formatCurrencyBRL(item.valor)}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell">
                <span className="inline-flex items-center rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider text-destructive">
                  {item.status}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-sm font-medium text-foreground">
                {item.dias_em_atraso}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="border-b border-border bg-muted/40 p-3">
        <div className="h-4 w-32 rounded bg-muted animate-pulse" />
      </div>
      <div className="divide-y divide-border">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
