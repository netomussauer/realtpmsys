import { cn } from "@/shared/lib/utils";
import type { FrequenciaTurmaResponse } from "@/features/relatorios/types/relatorio.types";

interface FrequenciaTurmaTableProps {
  resultado: FrequenciaTurmaResponse | undefined;
  isLoading?: boolean;
}

/**
 * Tabela do relatório de frequência consolidado por turma
 * (`GET /relatorios/frequencia/turma/{turmaId}`) — uma linha por atleta
 * matriculado, com `atleta_nome` já resolvido pelo backend (diferente do
 * resto do projeto, não precisa de `useAtleta` aqui).
 */
export function FrequenciaTurmaTable({ resultado, isLoading }: FrequenciaTurmaTableProps) {
  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!resultado) return null;

  if (resultado.data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
        <p className="font-display text-xl text-primary">Sem dados de frequência</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Nenhum treino registrado para esta turma no período selecionado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        <strong className="text-foreground">{resultado.total_treinos}</strong> treino(s) no
        período.
      </p>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full">
          <caption className="sr-only">Frequência por atleta da turma no período selecionado</caption>
          <thead className="border-b border-border bg-muted/40">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th scope="col" className="px-4 py-3 font-medium">
                Atleta
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-right">
                Presenças
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-right hidden sm:table-cell">
                Faltas
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-right hidden sm:table-cell">
                Justificadas
              </th>
              <th scope="col" className="px-4 py-3 font-medium text-right">
                Taxa
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {resultado.data.map((item) => (
              <tr key={item.atleta_id}>
                <td className="px-4 py-3 font-medium text-foreground">{item.atleta_nome}</td>
                <td className="px-4 py-3 text-right text-green-700">{item.presentes}</td>
                <td className="px-4 py-3 text-right text-destructive hidden sm:table-cell">
                  {item.ausentes}
                </td>
                <td className="px-4 py-3 text-right text-yellow-700 hidden sm:table-cell">
                  {item.justificados}
                </td>
                <td
                  className={cn(
                    "px-4 py-3 text-right font-medium",
                    item.taxa_presenca_pc < 50 ? "text-destructive" : "text-foreground",
                  )}
                >
                  {item.taxa_presenca_pc.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
            <div className="h-4 w-16 rounded bg-muted animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
